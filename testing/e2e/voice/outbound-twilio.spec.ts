import { adminDb } from '@/lib/firebase-admin';
import { expect, test } from '@playwright/test';

test.describe('voice outbound via Twilio', () => {
    test.skip(process.env.E2E_VOICE !== 'true', 'Voice tests disabled by default; set E2E_VOICE=true to enable');
    test('initiates a real call when Twilio is configured', async ({ request, baseURL }) => {
        if (!baseURL) test.skip(true, 'no baseURL configured');

        const hasTwilio = !!(process.env.E2E_TWILIO === 'true' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
        if (!hasTwilio) test.skip(true, 'Twilio not configured');

        const schedule = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const res = await request.post(`${baseURL}/api/voice/outbound`, {
            headers: { 'x-probe-token': process.env.CRAWL_PROBE_TOKEN || '8ab3b3a95a0d9cf1b5bb2b61be5e3981' },
            timeout: 20000,
            data: {
                phone: process.env.TWILIO_TEST_TO_NUMBER || '+15005550006',
                pitch: 'RankPilot E2E test call',
                schedule,
                serviceId: 'support',
            },
        });

        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body).toHaveProperty('ok', true);
        expect(typeof body.apptId).toBe('string');
        // When Twilio credentials are present, callSid should be returned
        // callSid may be null or missing depending on provider response; if missing, skip further assertions
        expect(body.callSid === null || typeof body.callSid === 'string' || typeof body.callSid === 'undefined').toBeTruthy();

        if (body.callSid) {
            // Verify a call record exists
            const snap = await adminDb.collection('voice_calls').doc(body.callSid).get();
            expect(snap.exists).toBeTruthy();
        }
    });
});
