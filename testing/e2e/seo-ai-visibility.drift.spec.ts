import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// @accuracy @ai
test.describe('AI Visibility drift tolerance', () => {
    const fixtureDir = path.resolve(process.cwd(), 'test-results', 'fixtures');
    const baselinePath = path.join(fixtureDir, 'ai-visibility-baseline.json');
    const body = { url: 'https://example.com', query: 'seo optimization', analysisType: 'quick' };

    test('baseline snapshot creation (idempotent)', async ({ request }) => {
        if (!fs.existsSync(baselinePath)) {
            fs.mkdirSync(fixtureDir, { recursive: true });
            const resp = await request.post('/api/neuroseo/ai-visibility', { data: body });
            expect(resp.ok()).toBeTruthy();
            const json = await resp.json();
            fs.writeFileSync(baselinePath, JSON.stringify(json, null, 2));
        }
        expect(fs.existsSync(baselinePath)).toBeTruthy();
    });

    test('current response within drift thresholds', async ({ request }) => {
        if (!fs.existsSync(baselinePath)) test.skip();
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const resp = await request.post('/api/neuroseo/ai-visibility', { data: body });
        expect(resp.ok()).toBeTruthy();
        const current = await resp.json();
        // Numeric fields drift thresholds
        const numFields = ['score', 'citationRate'];
        for (const f of numFields) {
            if (typeof baseline[f] === 'number' && typeof current[f] === 'number') {
                const base = baseline[f];
                const curr = current[f];
                const absDiff = Math.abs(curr - base);
                const pctDiff = base ? (absDiff / base) * 100 : 0;
                expect(pctDiff).toBeLessThanOrEqual(25); // allow 25% drift
            }
        }
        // Visibility length should not shrink drastically (>50% reduction)
        if (Array.isArray(baseline.visibility) && Array.isArray(current.visibility)) {
            if (baseline.visibility.length > 0) {
                expect(current.visibility.length).toBeGreaterThanOrEqual(Math.floor(baseline.visibility.length * 0.5));
            }
        }
    });
});
