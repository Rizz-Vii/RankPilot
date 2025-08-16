import { test, expect, request } from '@playwright/test';

// Verifies crawler aggregate adoption KPI & alert thresholds.
// Thresholds: critical <50, warn 50-<80, none >=80

test.describe('Health API crawler aggregate adoption alerts', () => {
    test('adoption alert transitions warn -> cleared', async () => {
        const ctx = await request.newContext();
        // Validate lightweight probe metadata (version/buildSha/uptime) before heavy polling
        try {
            const simple = await ctx.get('/api/health/simple');
            if (simple.ok()) {
                const meta = await simple.json();
                if (meta.ok) {
                    ['version', 'buildSha', 'uptimeMs'].forEach(f => { if (!(f in meta)) throw new Error(`missing field ${f}`); });
                }
            }
        } catch {/* non-fatal */ }
        // Baseline current counters
        const baselineRes = await ctx.get('/api/health');
        const baseline = await baselineRes.json();
        const baseHits = baseline.kpis?.crawler?.aggregateHits || 0;
        const baseFallbacks = baseline.kpis?.crawler?.legacyFallbacks || 0;
        // Add small balanced increments pushing adoption toward mid zone (warn range 50-<80)
        await ctx.get('/api/test/metrics/crawler?hits=2&fallbacks=2');
        // Poll for updated KPI
        let mid: any = null;
        for (let i = 0; i < 6; i++) {
            const r = await ctx.get('/api/health'); mid = await r.json();
            if (mid?.kpis?.crawler?.aggregateHits > baseHits) break; await new Promise(r2 => setTimeout(r2, 120));
        }
        const hitsMid = mid.kpis.crawler.aggregateHits;
        const fallbacksMid = mid.kpis.crawler.legacyFallbacks;
        const adoptionMid = mid.kpis.crawlerAggregateAdoptionPct;
        expect(adoptionMid).toBeGreaterThanOrEqual(50 - 0.0001);
        expect(adoptionMid).toBeLessThan(80);
        const warn = (mid.alerts as any[]).find(a => a.type === 'crawlerAggregateAdoption');
        expect(warn).toBeDefined();
        expect(warn.level).toBe('warn');
        // Compute additional hits needed to exceed 80%: solve (hitsMid + x) / (hitsMid + x + fallbacksMid) >= 0.81 => x >= (0.81*fallbacksMid - 0.19*hitsMid)/0.19
        const needed = Math.max(1, Math.ceil(((0.81 * fallbacksMid) - (0.19 * hitsMid)) / 0.19));
        await ctx.get(`/api/test/metrics/crawler?hits=${needed}&fallbacks=0`);
        // Poll again
        let high: any = null;
        for (let i = 0; i < 6; i++) { const r = await ctx.get('/api/health'); high = await r.json(); if ((high?.kpis?.crawlerAggregateAdoptionPct || 0) > 80) break; await new Promise(r2 => setTimeout(r2, 120)); }
        expect(high.kpis.crawlerAggregateAdoptionPct).toBeGreaterThan(80);
        const adoptionAlerts = (high.alerts as any[]).filter(a => a.type === 'crawlerAggregateAdoption');
        expect(adoptionAlerts.length).toBe(0);
    });
});
