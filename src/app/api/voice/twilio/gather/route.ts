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
    const logger = getLogger('api.voice.twilio.gather');
    try {
        const contentType = req.headers.get('content-type') || '';
        let params: Record<string, string | undefined> = {};
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await req.text();
            const usp = new URLSearchParams(text);
            usp.forEach((v, k) => (params[k] = v));
        } else {
            params = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
        }

        if (!(await validateTwilioSignature(req, params))) {
            return NextResponse.json({ error: 'signature_invalid' }, { status: 403 });
        }

        const callSid = String(params['CallSid'] || '');
        const digits = params['Digits'];
        const speechResult = params['SpeechResult'];
        const confidence = params['Confidence'];
        logger.info('twilio_gather_event', { callSid, digits, speechResult, confidence });

        if (adminDb && callSid) {
            await adminDb.collection('voice_calls').doc(callSid).set(
                {
                    callSid,
                    gather: {
                        digits: digits || null,
                        speechResult: speechResult || null,
                        confidence: confidence ? Number(confidence) : null,
                        at: new Date().toISOString(),
                    },
                    lastEventAt: new Date().toISOString(),
                },
                { merge: true }
            );
        }

        // Respond with simple TwiML to continue the call gracefully
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>Thank you.</Say>\n</Response>`;
        return new Response(twiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('twilio_gather_error', { error: msg });
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
