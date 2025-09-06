// Lazy-load logger to avoid ESM/directory import issues in test runtimes
type Logger = { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void; degraded: (...args: unknown[]) => void; audit?: (...args: unknown[]) => void };
let getLogger: (name: string) => Logger;
try {
    // require to avoid ESM import issues in certain runtimes
    getLogger = require('../logging/app-logger').getLogger as (name: string) => Logger;
} catch (e) {
    // Fallback no-op logger
    getLogger = (_name: string) => ({
        info: () => { },
        error: () => { },
        degraded: () => { },
        audit: () => { },
    });
}

// Lazy Firestore handle: prefer adminDb on server, fallback to client db
let db: unknown;
try {
    const admin = require('../firebase-admin');
    if (admin && admin.adminDb) db = admin.adminDb;
} catch { /* ignore */ }
if (!db) {
    try {
        db = require('../firebase').db;
    } catch { db = undefined; }
}

const logger = getLogger('voice.agent-tools');

export async function getAvailability({ serviceId, from, to }: { serviceId?: string; from?: string; to?: string }) {
    logger.info('getAvailability', { serviceId, from, to });
    // Minimal stub: query slots collection if available
    try {
        if (db && typeof (db as any).collection === 'function') {
            try {
                const q = await (db as any).collection('voice_slots').where('serviceId', '==', serviceId || null).limit(50).get();
                const slots: Array<Record<string, unknown>> = [];
                q.forEach((d: any) => slots.push({ id: d.id, ...(d.data() as object) }));
                return { ok: true, slots };
            } catch (err) {
                logger.degraded('getAvailability.firestore_error', { error: String(err) });
                return { ok: true, slots: [] };
            }
        }

        // Local fallback: return empty slots list
        return { ok: true, slots: [] };
    } catch (err) {
        logger.error('getAvailability.error', { error: String(err) });
        throw err;
    }
}

export async function holdSlot({ slotId, ttlMs }: { slotId: string; ttlMs?: number }) {
    logger.info('holdSlot', { slotId, ttlMs });
    const now = Date.now();
    const ttl = typeof ttlMs === 'number' ? ttlMs : 15 * 60 * 1000; // default 15m
    const heldUntil = new Date(now + ttl).toISOString();

    if (db && typeof (db as any).runTransaction === 'function') {
        const holdsCol = (db as any).collection('voice_holds');
        const docRef = slotId ? holdsCol.doc(slotId) : holdsCol.doc();
        const holdId = docRef.id;

        try {
            await (db as any).runTransaction(async (tx: any) => {
                const snap = await tx.get(docRef);
                if (snap.exists) {
                    const data = snap.data();
                    if (data?.status === 'held' && data?.heldUntil && new Date(data.heldUntil) > new Date()) {
                        throw new Error('slot_already_held');
                    }
                }

                tx.set(docRef, {
                    status: 'held',
                    slotId: slotId || null,
                    heldAt: new Date(now).toISOString(),
                    heldUntil,
                });
            });

            return { ok: true, holdId };
        } catch (err) {
            logger.error('holdSlot.transaction_error', { error: String(err), slotId });
            return { ok: false, error: String(err) };
        }
    }

    // Local fallback: return synthetic hold id
    const fallbackHoldId = `hold_local_${Date.now()}`;
    logger.degraded('holdSlot.local_fallback', { fallbackHoldId });
    return { ok: true, holdId: fallbackHoldId };
}

export async function createAppointment(payload: Record<string, unknown>) {
    logger.info('createAppointment', { payload: { serviceId: payload?.serviceId, start: payload?.start } });
    const apptId = `appt_${Date.now()}`;

    // Derive initial nextOccurrence when repeat is requested
    let nextOccurrence: Date | undefined;
    try {
        const repeat = (payload as any)?.repeat as 'daily' | 'weekly' | undefined;
        const startRaw = (payload as any)?.start as string | Date | undefined;
        if (repeat && startRaw) {
            const startDate = typeof startRaw === 'string' ? new Date(startRaw) : startRaw;
            if (!isNaN(startDate.getTime())) {
                // Seed nextOccurrence to the initial start time; scheduler will push it forward after each tick
                nextOccurrence = startDate;
            }
        }
    } catch { /* ignore */ }

    // If we have Firestore with transactions, attempt atomic confirm of hold -> appointment
    if (db && typeof (db as any).runTransaction === 'function') {
        try {
            const appointmentsCol = (db as any).collection('appointments');
            const holdsCol = (db as any).collection('voice_holds');
            const apptRef = appointmentsCol.doc(apptId);
            const holdRef = payload?.holdId ? holdsCol.doc(payload.holdId) : null;

            await (db as any).runTransaction(async (tx: any) => {
                if (holdRef) {
                    const holdSnap = await tx.get(holdRef);
                    if (!holdSnap.exists) throw new Error('hold_not_found');
                    const hold = holdSnap.data();
                    if (hold.status !== 'held') throw new Error('hold_not_valid');
                    if (hold.heldUntil && new Date(hold.heldUntil) < new Date()) throw new Error('hold_expired');
                    // mark hold as booked
                    tx.update(holdRef, { status: 'booked', bookedAt: new Date().toISOString(), apptId });
                }

                tx.set(apptRef, {
                    ...(payload || {}),
                    apptId,
                    createdAt: new Date().toISOString(),
                    status: 'confirmed',
                    ...(nextOccurrence ? { nextOccurrence } : {}),
                });
            });

            // Optionally enqueue confirmation (include recipient when available)
            try {
                const customer = payload?.customer || null;
                if (typeof (sendConfirmationImpl as any) === 'function') await (sendConfirmationImpl as any)({ apptId, customer, payload });
            } catch (e) {
                logger.degraded('createAppointment.confirmation_failed', { error: String(e), apptId });
            }

            return { ok: true, apptId };
        } catch (err) {
            logger.error('createAppointment.transaction_error', { error: String(err), payload });
            return { ok: false, error: String(err) };
        }
    }

    // Local fallback: non-transactional write (best-effort)
    try {
        if (db && typeof (db as any).collection === 'function') {
            await (db as any).collection('appointments').doc(apptId).set({ ...(payload || {}), apptId, createdAt: new Date().toISOString(), status: 'confirmed', ...(nextOccurrence ? { nextOccurrence } : {}) });
        } else {
            logger.degraded('createAppointment.local_fallback', { apptId });
        }

        // best-effort confirmation (include recipient when available)
        const customer = payload?.customer || null;
        if (typeof (sendConfirmationImpl as any) === 'function') await (sendConfirmationImpl as any)({ apptId, customer, payload });
        return { ok: true, apptId };
    } catch (err) {
        logger.error('createAppointment.error', { error: String(err) });
        return { ok: false, error: String(err) };
    }
}
export async function sendConfirmation({ apptId, customer, payload }: { apptId: string; customer?: { email?: string | null; phone?: string | null; name?: string | null } | null; payload?: Record<string, unknown> }) {
    logger.info('sendConfirmation', { apptId, customer });
    try {
        if (db && typeof (db as any).collection === 'function') {
            // record confirmation document (try add(), fall back to doc().set())
            try {
                const vc = (db as any).collection('voice_confirmations');
                const doc = { apptId, customer: customer || null, payload: payload || null, createdAt: new Date().toISOString() };
                if (vc && typeof vc.add === 'function') {
                    await vc.add(doc);
                } else if (vc && typeof vc.doc === 'function') {
                    await vc.doc().set(doc);
                } else {
                    logger.degraded('sendConfirmation.no_write_method', { apptId });
                }
            } catch (e) {
                logger.degraded('sendConfirmation.voice_confirmations_failed', { error: String(e), apptId });
            }

            // also enqueue an email to emailQueue (if available), with same defensive pattern
            try {
                const eq = (db as any).collection('emailQueue');
                const recipient = (customer && (customer.email || customer.phone)) || null;
                const emailPayload = {
                    to: recipient,
                    recipients: {
                        email: customer?.email || null,
                        phone: customer?.phone || null,
                    },
                    subject: `Appointment confirmed - ${apptId}`,
                    body: `Hello ${customer?.name || 'Customer'}, your appointment (${apptId}) is confirmed for ${(payload as any)?.start || 'the scheduled time'}.`,
                    type: 'appointment_confirmation',
                    meta: { apptId },
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                };
                if (eq && typeof eq.add === 'function') {
                    await eq.add(emailPayload);
                } else if (eq && typeof eq.doc === 'function') {
                    await eq.doc().set(emailPayload);
                } else {
                    logger.degraded('sendConfirmation.email_queue_no_write', { apptId });
                }
            } catch (e) {
                logger.degraded('sendConfirmation.email_enqueue_failed', { error: String(e), apptId });
            }
        }
        return { ok: true };
    } catch (err) {
        logger.degraded('sendConfirmation.error', { error: String(err), apptId });
        return { ok: false, error: String(err) };
    }
}

export function buildEmailQueuePayload({ apptId, customer, payload }: { apptId: string; customer?: { email?: string | null; phone?: string | null; name?: string | null } | null; payload?: Record<string, unknown> }) {
    const recipient = (customer && (customer.email || customer.phone)) || null;
    return {
        to: recipient,
        recipients: {
            email: customer?.email || null,
            phone: customer?.phone || null,
        },
        subject: `Appointment confirmed - ${apptId}`,
        body: `Hello ${customer?.name || 'Customer'}, your appointment (${apptId}) is confirmed for ${(payload as any)?.start || 'the scheduled time'}.`,
        type: 'appointment_confirmation',
        meta: { apptId },
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
}


// internal hook to allow test suites to override confirmation behavior
let sendConfirmationImpl: (opts: { apptId: string; to?: string | null }) => Promise<unknown> = async (opts) => {
    // delegate to the exported sendConfirmation (actual implementation)
    return sendConfirmation(opts as any);
};

export function __test_setSendConfirmationImpl(fn: any) {
    sendConfirmationImpl = fn;
}

