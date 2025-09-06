import { getTwilioClient, getTwilioFromNumber, getTwilioFromNumbersList } from '@/lib/telephony/twilio';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Lazy logger
type Logger = { info: (m: string, o?: unknown) => void; error: (m: string, o?: unknown) => void; degraded: (m: string, o?: unknown) => void; audit: (m: string, o?: unknown) => void };
let _logger: Logger | null = null;
async function getLoggerLazy() {
    if (_logger) return _logger;
    try {
        const mod = await import('../../../../lib/logging/app-logger');
        const getLogger = (mod as { getLogger: (n: string) => Logger }).getLogger;
        _logger = getLogger('api.voice.outbound');
    } catch {
        _logger = { info: () => { }, error: () => { }, degraded: () => { }, audit: () => { } } as Logger;
    }
    return _logger;
}

export async function POST(req: NextRequest) {
    const logger = await getLoggerLazy();
    try {
        const body = await req.json().catch(() => ({}));
        // Accept single or multiple recipients
        const phone = String((body as { phone?: unknown })?.phone || "").trim();
        const phonesArr = Array.isArray((body as { phones?: unknown })?.phones)
            ? ((body as { phones?: string[] }).phones || []).map((p) => String(p).trim()).filter(Boolean)
            : [];
        const recipients = [phone, ...phonesArr].filter(Boolean);
        // Script content (prefer 'script' over legacy 'pitch')
        const script = String((body as { script?: unknown })?.script || "").trim();
        const pitch = String((body as { pitch?: unknown })?.pitch || "").trim();
        const sayBase = script || pitch;
        const schedule = String((body as { schedule?: unknown })?.schedule || "").trim();
        const serviceId = String((body as { serviceId?: unknown })?.serviceId || "voice-demo");
        // Voice/tone options
        const sayVoice = String((body as { voice?: unknown })?.voice || (process.env.TWILIO_SAY_VOICE || "alice")); // alice|man|woman|Polly.X
        const sayLanguage = String((body as { language?: unknown })?.language || (process.env.TWILIO_SAY_LANGUAGE || "en-US"));
        const sayRate = Number((body as { rate?: unknown })?.rate || (process.env.TWILIO_SAY_RATE || 1)); // 0.5-2.0
        // Optional: use a pre-recorded voice file URL instead of synthesized speech
        const recordingUrl = String((body as { recordingUrl?: unknown })?.recordingUrl || "").trim();
        // Interactive dialog (beta)
        const interactive = Boolean((body as { interactive?: unknown })?.interactive);
        // Optional: recurrence metadata (UI-level scheduling hint)
        const repeatRaw = String((body as { repeat?: unknown })?.repeat || "").trim().toLowerCase();
        const repeat = repeatRaw === 'daily' || repeatRaw === 'weekly' ? repeatRaw : '';
        // From number override (validated against allowed list if provided)
        const fromOverride = String((body as { from?: unknown })?.from || "").trim();
        const allowedFrom = getTwilioFromNumbersList();

        if (!recipients.length) return NextResponse.json({ ok: false, error: 'missing_phone' }, { status: 400 });
        if (!schedule) return NextResponse.json({ ok: false, error: 'missing_schedule' }, { status: 400 });

        // Decide: immediate vs scheduled. If future, enqueue instead of calling now.
        const defaultFrom = getTwilioFromNumber();
        const fromNumber = fromOverride
            ? (allowedFrom.length ? (allowedFrom.includes(fromOverride) ? fromOverride : null) : fromOverride)
            : defaultFrom;
        const results: Array<{ to: string; callSid: string | null; callStatus: string | null }> = [];

        const whenMs = Date.parse(schedule);
        // Treat only schedules more than 2 minutes out as deferred queue jobs; near-term stays immediate
        const future = Number.isFinite(whenMs) && whenMs > Date.now() + 120_000;
        const admin = await import('../../../../lib/firebase-admin');
        type AdminCollection = { doc: (id?: string) => { set: (data: unknown, opts?: unknown) => Promise<void> }; add: (data: unknown) => Promise<{ id: string }> };
        type AdminDb = { collection: (n: string) => AdminCollection };
        const adminDb = (admin as { adminDb?: unknown })?.adminDb as AdminDb | undefined;

        if (future && adminDb) {
            // Write queue item per recipient and create placeholder voice_calls docs with status 'scheduled'
            for (const to of recipients) {
                const queueDoc = await adminDb.collection('voice_outbound_queue').add({
                    createdAt: new Date().toISOString(),
                    schedule: new Date(whenMs),
                    to,
                    from: fromNumber || null,
                    config: { voice: sayVoice, language: sayLanguage, rate: sayRate, recordingUrl: recordingUrl || null, interactive, script: sayBase || null },
                    status: 'queued',
                });
                try {
                    await adminDb.collection('voice_calls').add({
                        callSid: null,
                        to,
                        from: fromNumber || null,
                        status: 'scheduled',
                        direction: 'outbound-scheduled',
                        createdAt: new Date().toISOString(),
                        plannedAt: new Date(whenMs).toISOString(),
                        config: { voice: sayVoice, language: sayLanguage, rate: sayRate, recordingUrl: recordingUrl || null, repeat: repeat || null, interactive, script: sayBase || null },
                        queueItemId: queueDoc.id,
                    });
                } catch { /* best-effort */ }
                results.push({ to, callSid: null, callStatus: 'scheduled' });
            }
        } else {
            // Immediate call (backwards compatible)
            const twilio = getTwilioClient();
            if (twilio && fromNumber) {
                try {
                    const sayText = sayBase
                        ? `Hello. This is RankPilot. ${sayBase}. We'll send a confirmation shortly. Goodbye.`
                        : `Hello. This is RankPilot. We are confirming your appointment. Goodbye.`;
                    const prosodyOpen = sayRate && sayRate !== 1 ? `<prosody rate="${Math.round(sayRate * 100)}%">` : '';
                    const prosodyClose = sayRate && sayRate !== 1 ? `</prosody>` : '';
                    let twiml = recordingUrl
                        ? `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>${recordingUrl}</Play>\n</Response>`
                        : `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="${sayVoice}" language="${sayLanguage}">${prosodyOpen}${sayText}${prosodyClose}</Say>\n</Response>`;
                    if (interactive) {
                        const prompt = sayBase ? ` ${sayBase} ` : '';
                        twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech dtmf" numDigits="1" timeout="5">\n    <Say voice="${sayVoice}" language="${sayLanguage}">${prosodyOpen}${prompt}Press 1 if interested, or say 'yes'.${prosodyClose}</Say>\n  </Gather>\n  <Say voice="${sayVoice}" language="${sayLanguage}">Thank you. Goodbye.</Say>\n</Response>`;
                    }

                    for (const to of recipients) {
                        const call = await twilio.calls.create({
                            to,
                            from: fromNumber,
                            twiml,
                            statusCallback: process.env.PUBLIC_BASE_URL
                                ? `${process.env.PUBLIC_BASE_URL}/api/voice/twilio/status`
                                : undefined,
                            statusCallbackMethod: 'POST',
                            statusCallbackEvent: ['queued', 'initiated', 'ringing', 'answered', 'completed'] as string[],
                        } as unknown as Parameters<typeof twilio.calls.create>[0]);
                        const callSid = call?.sid || null;
                        const callStatus = call?.status || null;
                        results.push({ to, callSid, callStatus });
                        try {
                            if (adminDb) {
                                if (callSid) await adminDb.collection('voice_calls').doc(callSid).set({
                                    callSid,
                                    to,
                                    from: fromNumber,
                                    status: callStatus || 'queued',
                                    direction: 'outbound-api',
                                    createdAt: new Date().toISOString(),
                                    config: { voice: sayVoice, language: sayLanguage, rate: sayRate, recordingUrl: recordingUrl || null, repeat: repeat || null, interactive, script: sayBase || null },
                                }); else await adminDb.collection('voice_calls').add({
                                    callSid: null,
                                    to,
                                    from: fromNumber,
                                    status: callStatus || 'queued',
                                    direction: 'outbound-api',
                                    createdAt: new Date().toISOString(),
                                    config: { voice: sayVoice, language: sayLanguage, rate: sayRate, recordingUrl: recordingUrl || null, repeat: repeat || null, interactive, script: sayBase || null },
                                });
                            }
                        } catch (e) {
                            (logger!).degraded('twilio.call.record_failed', { error: String(e) });
                        }
                    }
                } catch (e) {
                    (logger!).degraded('twilio.call.create_failed', { error: String(e) });
                }
            } else {
                (logger!).degraded('twilio.not_configured', { hasClient: !!twilio, hasFrom: !!fromNumber });
            }
        }

        // Proceed to create an appointment and send confirmation via existing tools.
        const tools = await import('../../../../lib/voice/agent-tools');

        const payload = {
            start: schedule,
            serviceId,
            source: 'voice_outbound',
            assignedTo: 'system:voice-agent',
            repeat: repeat || undefined,
            customer: { phone: recipients[0], name: 'Prospect', pitch: sayBase },
            payload: { interactive, script: sayBase },
        };
        const res = await (tools as { createAppointment: (p: typeof payload) => Promise<{ ok?: boolean; apptId?: string; error?: string }> }).createAppointment(payload);
        if (res?.ok) return NextResponse.json({ ok: true, apptId: res.apptId, results, from: fromNumber, voice: sayVoice, language: sayLanguage, rate: sayRate });
        return NextResponse.json({ ok: false, error: res?.error || 'failed' }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
