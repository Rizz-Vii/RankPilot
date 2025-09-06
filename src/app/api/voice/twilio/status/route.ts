import { adminDb } from '@/lib/firebase-admin';
import { getLogger } from '@/lib/logging/app-logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

async function validateTwilioSignature(req: NextRequest, params: Record<string, string | undefined>): Promise<boolean> {
    try {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const signature = req.headers.get('x-twilio-signature');
        const isProd = process.env.NODE_ENV === 'production';
        const testBypass = process.env.TWILIO_TEST_MODE === '1';
        if (!isProd && testBypass) return true;
        if (!authToken || !signature) return false;
        const twilioMod = await import('twilio');
        const validateRequest = (twilioMod as unknown as {
            validateRequest: (authToken: string, signature: string, url: string, params: Record<string, string | undefined>) => boolean;
        }).validateRequest;
        const url = req.url;
        return validateRequest(authToken, signature, url, params);
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    const logger = getLogger('api.voice.twilio.status');
    try {
        // Parse body (form or JSON)
        const contentType = req.headers.get('content-type') || '';
        let params: Record<string, string | undefined> = {};
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await req.text();
            const usp = new URLSearchParams(text);
            usp.forEach((v, k) => (params[k] = v));
        } else {
            params = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
        }

        // Validate signature (strict in prod, test bypass allowed in dev/test)
        if (!(await validateTwilioSignature(req, params))) {
            return NextResponse.json({ error: 'signature_invalid' }, { status: 403 });
        }

        const event = {
            CallSid: params['CallSid'],
            CallStatus: params['CallStatus'],
            From: params['From'],
            To: params['To'],
            Direction: params['Direction'],
            EventType: params['CallStatus'] || params['StatusCallbackEvent'],
            RecordingSid: params['RecordingSid'],
            RecordingUrl: params['RecordingUrl'],
        };
        logger.info('twilio_status_event', event);

        // Persist to Firestore for observability
        const callSid = String(event.CallSid || '');
        const status = String(event.CallStatus || 'unknown');
        if (adminDb && callSid) {
            await adminDb.collection('voice_calls').doc(callSid).set(
                {
                    callSid,
                    status,
                    lastEventAt: new Date().toISOString(),
                    raw: params || null,
                    recording: params?.['RecordingSid'] || params?.['RecordingUrl']
                        ? { sid: params?.['RecordingSid'] || null, url: params?.['RecordingUrl'] || null }
                        : undefined,
                },
                { merge: true },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('twilio_status_error', { error: msg });
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
