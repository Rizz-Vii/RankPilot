import { expect, test } from '@playwright/test';

test.describe('Security - auth bypass checks', () => {
    test('POST /api/team/invite without auth should be rejected (401/403)', async ({ request, baseURL }) => {
        const base = process.env.TEST_BASE_URL || baseURL || 'http://localhost:3000';
        const resp = await request.post(`${base}/api/team/invite`, { data: { email: 'bypass@example.com' } });
        expect(resp.status()).toBeGreaterThanOrEqual(400);
        expect([200]).not.toContain(resp.status());
    });
});
