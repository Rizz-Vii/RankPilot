import { expect, test } from '@playwright/test';

// Contract test for NeuroSEO AI visibility endpoint
test.describe('NeuroSEO AI Visibility API', () => {
    test('response shape + basic field sanity', async ({ request }) => {
        const resp = await request.get('/api/neuroseo/ai-visibility');
        expect(resp.ok()).toBeTruthy();
        const json = await resp.json();
        // Flexible assertions (endpoint may evolve). Ensure key performance & content indicators present.
        expect(json).toHaveProperty('ok');
        // At least one of metrics/summary/visibility keys should exist
        const hasInteresting = ['metrics', 'summary', 'visibility', 'domains'].some(k => k in json);
        expect(hasInteresting).toBeTruthy();
    });
});
