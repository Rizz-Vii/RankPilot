import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { scheduler } from "firebase-functions/v2";

type Repeat = 'daily' | 'weekly';
type TimestampLike = { toDate?: () => Date } | Date | null | undefined;
type AppointmentDoc = {
    repeat?: Repeat;
    customer?: { phone?: string | null; name?: string | null } | null;
    payload?: {
        voice?: string;
        language?: string;
        rate?: number;
        recordingUrl?: string | null;
        interactive?: boolean;
    } | null;
    config?: {
        voice?: string;
        language?: string;
        rate?: number;
        recordingUrl?: string | null;
        interactive?: boolean;
    } | null;
    from?: string | null;
    nextOccurrence?: TimestampLike;
};
function toDateLike(v: TimestampLike): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'object' && typeof v.toDate === 'function') {
        const d = v.toDate();
        return d instanceof Date ? d : null;
    }
    return null;
}

export async function processVoiceRecurringTick(injectedDb?: ReturnType<typeof getFirestore>, injectedNow?: Date) {
    if (!getApps().length) initializeApp();
    const db = injectedDb || getFirestore();
    const now = injectedNow || new Date();

    // Find voice appointments due to re-enqueue based on repeat metadata.
    // We look for appointments with a repeat field and nextOccurrence <= now.
    const snap = await db
        .collection('appointments')
        .where('repeat', 'in', ['daily', 'weekly'])
        .where('nextOccurrence', '<=', now)
        .orderBy('nextOccurrence', 'asc')
        .limit(50)
        .get()
        .catch((e: unknown) => {
            logger.error('voiceRecurring.query_error', { error: e instanceof Error ? e.message : String(e) });
            throw e;
        });

    if (snap.empty) {
        logger.info('voiceRecurring: none due');
        return { processed: 0 };
    }

    let processed = 0;
    for (const docSnap of snap.docs) {
        const data = docSnap.data() as AppointmentDoc;
        const repeat = data.repeat;
        const customer = data.customer ?? {};
        const payload = data.payload ?? {};
        const cfg = data.config ?? {};
        if (!repeat || !customer?.phone) continue;

        try {
            // Enqueue a new voice call task document for the next occurrence
            await db.collection('voice_outbound_queue').add({
                createdAt: now,
                schedule: new Date(now.getTime() + 60_000), // place 1 minute after tick to avoid exact overlap
                to: customer.phone,
                from: data.from ?? null,
                config: {
                    voice: cfg.voice ?? payload.voice ?? 'alice',
                    language: cfg.language ?? payload.language ?? 'en-US',
                    rate: typeof cfg.rate === 'number' ? cfg.rate : (typeof payload.rate === 'number' ? payload.rate : 1),
                    recordingUrl: cfg.recordingUrl ?? payload.recordingUrl ?? null,
                    interactive: typeof cfg.interactive === 'boolean' ? cfg.interactive : Boolean(payload.interactive),
                },
                repeat,
                sourceApptId: docSnap.id,
                status: 'queued',
            });

            // Compute and write nextOccurrence
            const base = toDateLike(data.nextOccurrence) || now;
            const next = new Date(base.getTime() + (repeat === 'daily' ? 86_400_000 : 7 * 86_400_000));
            await docSnap.ref.update({ nextOccurrence: next, updatedAt: FieldValue.serverTimestamp() });
            processed++;
        } catch (e) {
            logger.error('voiceRecurring.enqueue_error', { id: docSnap.id, error: String(e) });
        }
    }

    logger.info('voiceRecurring complete', { processed });
    return { processed };
}

export const processVoiceRecurring = scheduler.onSchedule(
    {
        schedule: 'every 15 minutes',
        timeZone: 'Etc/UTC',
        region: 'australia-southeast1',
        secrets: ['PUBLIC_BASE_URL'],
    },
    async () => { await processVoiceRecurringTick(); }
);
