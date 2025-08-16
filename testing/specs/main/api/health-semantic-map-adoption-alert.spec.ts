import { test, expect, request } from '@playwright/test';

// Verifies semantic map aggregate adoption KPI & alert thresholds.
// Thresholds: critical <50, warn 50-<80, none >=80

test.describe('Health API semantic map aggregate adoption alerts', () => {
    test('adoption alert transitions warn -> cleared', async () => {
        const ctx = await request.newContext();
        const baselineRes = await ctx.get('/api/health');
        await baselineRes.json(); // not used directly but triggers initial metrics
        // Push into mid warn range ~50-<80 with balanced increments
        await ctx.get('/api/test/metrics/semantic-map?hits=2&fallbacks=2');
        // Poll for KPI
        let mid: any = null;
        for (let i = 0; i < 6; i++) {
            const r = await ctx.get('/api/health'); mid = await r.json();
            if ((mid?.kpis?.semanticMapAggregateAdoptionPct || 0) >= 50) break;
            await new Promise(r2 => setTimeout(r2, 120));
        }
        const midPct = mid.kpis.semanticMapAggregateAdoptionPct;
        expect(midPct).toBeGreaterThanOrEqual(50 - 0.0001);
        expect(midPct).toBeLessThan(80);
        const warn = (mid.alerts as any[]).find(a => a.type === 'semanticMapAggregateAdoption');
        expect(warn).toBeDefined();
        expect(warn.level).toBe('warn');
        // Compute hits needed to exceed 80%
        const hitsMid = mid.metrics.unified.semanticMap.aggregateHits;
        const fallbacksMid = mid.metrics.unified.semanticMap.legacyFallbacks;
        const needed = Math.max(1, Math.ceil(((0.81 * fallbacksMid) - (0.19 * hitsMid)) / 0.19));
        await ctx.get(`/api/test/metrics/semantic-map?hits=${needed}&fallbacks=0`);
        let high: any = null;
        for (let i = 0; i < 6; i++) { const r = await ctx.get('/api/health'); high = await r.json(); if ((high?.kpis?.semanticMapAggregateAdoptionPct || 0) > 80) break; await new Promise(r2 => setTimeout(r2, 120)); }
        expect(high.kpis.semanticMapAggregateAdoptionPct).toBeGreaterThan(80);
        const cleared = (high.alerts as any[]).filter(a => a.type === 'semanticMapAggregateAdoption');
        expect(cleared.length).toBe(0);
    });
});
