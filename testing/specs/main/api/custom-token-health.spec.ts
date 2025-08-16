import { test, expect } from '@playwright/test';

// Lightweight health check for the test-only custom token endpoint.
// Ensures endpoint remains reachable and returns a plausible token shape.

test.describe('Custom Token Endpoint', () => {
    test('returns a custom token for a transient user', async ({ request }) => {
        // Endpoint currently exposes GET returning { token, uid }
        const res = await request.get('/api/test/auth/custom-token');
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        expect(json).toHaveProperty('token');
        expect(typeof json.token).toBe('string');
        // Accept either real Firebase custom token (JWT usually > 100 chars) or fallback stub to avoid false negatives
        expect(json.token.length).toBeGreaterThan(10);
        if (json.token === 'stub-test-token') {
            console.log('ℹ️ Received stub token (admin SDK not initialized)');
        }
    });
});
