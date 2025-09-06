import { expect, test } from '@playwright/test'; // @accuracy @ai

// Domain-specific expected fixture (coarse) to validate stability of core fields.
const fixtureShape = {
    requiredTopLevel: ['score', 'citationRate', 'visibility', 'recommendations', 'platforms', 'meta'],
    visibilityFields: ['citation', 'optimization'],
    citationInner: ['platform', 'position', 'snippet', 'confidence', 'url'],
    optimizationInner: ['recommendations', 'priority', 'impact'],
};

test.describe('AI Visibility accuracy', () => {
    test('single query analysis produces consistent core metrics', async ({ request }) => {
        const body = { url: 'https://example.com', query: 'seo optimization', analysisType: 'quick' };
        const resp = await request.post('/api/neuroseo/ai-visibility', { data: body });
        expect(resp.ok()).toBeTruthy();
        const json = await resp.json();
        // Top-level presence
        for (const k of fixtureShape.requiredTopLevel) {
            expect(json).toHaveProperty(k);
        }
        // Basic numeric sanity
        expect(typeof json.score).toBe('number');
        expect(json.score).toBeGreaterThanOrEqual(0);
        expect(json.score).toBeLessThanOrEqual(100);
        expect(typeof json.citationRate).toBe('number');
        // Visibility array sampling
        if (Array.isArray(json.visibility) && json.visibility.length) {
            const first = json.visibility[0];
            for (const f of fixtureShape.visibilityFields) expect(first).toHaveProperty(f);
            for (const c of fixtureShape.citationInner) expect(first.citation).toHaveProperty(c);
            for (const o of fixtureShape.optimizationInner) expect(first.optimization).toHaveProperty(o);
        }
    });
});
