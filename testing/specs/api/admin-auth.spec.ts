import { expect, test } from '@playwright/test';

// Minimal API auth tests for admin-gated endpoints
// Note: Success path (200) requires a valid admin token; we gate it behind env ADMIN_ID_TOKEN if provided.

const endpoints = [
    '/api/support/reply',
    '/api/admin/ai-usage/daily?start=2024-01-01&end=2024-01-01',
];

test.describe('Admin API auth gates', () => {
    for (const path of endpoints) {
        test(`401/403 without token: ${path}`, async ({ request, baseURL }) => {
            const url = `${baseURL}${path}`;
            const method = path.includes('/support/reply') ? 'POST' : 'GET';
            const res = await (method === 'POST'
                ? request.post(url, { data: { messageId: 'x', subject: 'Test', reply: 'Hello' } })
                : request.get(url));
            expect([401, 403]).toContain(res.status());
        });
    }

    const adminToken = process.env.ADMIN_ID_TOKEN;
    test.skip(!adminToken, 'ADMIN_ID_TOKEN not provided; skipping success-path checks');

    for (const path of endpoints) {
        test(`200 with admin token: ${path}`, async ({ request, baseURL }) => {
            const url = `${baseURL}${path}`;
            const method = path.includes('/support/reply') ? 'POST' : 'GET';
            const res = await (method === 'POST'
                ? request.post(url, {
                    data: { messageId: 'dev-fake-id', subject: 'Test', reply: 'Hello' },
                    headers: { Authorization: `Bearer ${adminToken}` },
                })
                : request.get(url, { headers: { Authorization: `Bearer ${adminToken}` } }));
            // Support reply may still 404/400 depending on data, but must not be 401/403 when admin token is present
            expect(res.status()).not.toBe(401);
            expect(res.status()).not.toBe(403);
        });
    }
});
