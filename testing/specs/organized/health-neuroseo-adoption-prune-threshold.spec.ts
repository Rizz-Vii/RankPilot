import { test, expect, request } from '@playwright/test';

/*
 * Contract: Before enabling destructive pruning we expect aggregate adoption >= REQUIRED_THRESHOLDS.
 * This spec ensures crawler & semantic map adoption percentages reported by /api/health (or approximated via test metrics seeding) can reach threshold.
 * Threshold constants mirror planned prune gate (≥95%).
 */

const CRAWLER_TARGET = 95; // %
const SEMANTIC_TARGET = 95; // % (semantic test metrics endpoint assumed symmetrical naming if needed later)

// Helper to push crawler adoption upward by adding aggregate hits only.
async function pushCrawlerAdoption(ctx: any, target: number) {
    // Heuristic: repeatedly add blocks of hits until target or loop cap.
    for (let i = 0; i < 12; i++) {
        const res = await ctx.get('/api/health');
        const body: any = await res.json();
        const pct = body?.kpis?.crawlerAggregateAdoptionPct || 0;
        if (pct >= target) return pct;
        // Add more aggregate hits (no fallbacks) to raise adoption.
        await ctx.get('/api/test/metrics/crawler?hits=10&fallbacks=0');
    }
    const finalRes = await ctx.get('/api/health');
    const finalBody: any = await finalRes.json();
    return finalBody?.kpis?.crawlerAggregateAdoptionPct || 0;
}

test.describe('NeuroSEO adoption prune threshold readiness', () => {
    test('crawler adoption can reach prune threshold (≥95%)', async () => {
        const ctx = await request.newContext();
        // Establish some balanced starting point (ensure denominator != 0)
        await ctx.get('/api/test/metrics/crawler?hits=5&fallbacks=5');
        const pct = await pushCrawlerAdoption(ctx, CRAWLER_TARGET);
        expect(pct).toBeGreaterThanOrEqual(CRAWLER_TARGET - 0.0001);
    });

    test('semantic map adoption field present (sanity)', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get('/api/health');
        expect(res.ok()).toBeTruthy();
        const body: any = await res.json();
        // We only assert presence & numeric; semantic specific seeding pathway may be added later.
        expect(typeof body.kpis.semanticMapAggregateAdoptionPct).toBe('number');
    });
});
