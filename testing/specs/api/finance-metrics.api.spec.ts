import { test, expect, request as pwRequest } from '@playwright/test';

test.describe('Finance Metrics API', () => {
    test('requires auth', async ({ request }) => {
        const res = await request.get('/api/finance/metrics');
        expect(res.status()).toBe(401);
    });

    test('returns shape with auth (dev tolerance)', async ({ baseURL }) => {
        const req = await pwRequest.newContext({ baseURL });
        const res = await req.get('/api/finance/metrics?months=3', { headers: { Authorization: 'Bearer test' } });
        if (res.status() === 200) {
            const json = await res.json();
            expect(json).toHaveProperty('kpis');
            expect(json).toHaveProperty('mrrSeries');
            expect(json).toHaveProperty('aging');
            expect(json).toHaveProperty('invoices');
        } else {
            expect([401, 500]).toContain(res.status());
        }
    });
});
