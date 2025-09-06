import { expect, request as pwRequest, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Runs in any environment. When TWILIO_TEST_MODE is not set, we explicitly pass testMode: true.
// This verifies the API endpoint without requiring Twilio credentials.

test.describe('API /api/telephony/call', () => {
    test('returns callSid in test mode', async () => {
        const req = await pwRequest.newContext();
        const res = await req.post(`${BASE_URL}/api/telephony/call`, {
            data: { to: '+15555550123', testMode: true },
            headers: { 'content-type': 'application/json' }
        });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body).toHaveProperty('callSid');
        expect(body).toMatchObject({ test: true });
    });
});
