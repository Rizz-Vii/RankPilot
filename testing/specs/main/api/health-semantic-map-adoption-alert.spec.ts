import { expect, request, test } from '@playwright/test';

// Verifies semantic map aggregate adoption KPI & alert thresholds.
// Thresholds: critical <50, warn 50-<80, none >=80

test.describe('Health API semantic map aggregate adoption alerts', () => {
    test('adoption alert transitions warn -> cleared', async () => {
        const ctx = await request.newContext();
        const getNumber = (v: unknown): number => typeof v === 'number' ? v : 0;
        const parseSemantic = (data: unknown) => {
            if (!data || typeof data !== 'object') return { adoption: 0, alerts: [] as Array<{ type?: string; level?: string }>, hits: 0, fallbacks: 0 };
            const root = data as Record<string, unknown>;
            const kpisRaw = root['kpis'];
            const kpis = kpisRaw && typeof kpisRaw === 'object' ? kpisRaw as Record<string, unknown> : undefined;
            const metricsRaw = root['metrics'];
            const metrics = metricsRaw && typeof metricsRaw === 'object' ? metricsRaw as Record<string, unknown> : undefined;
            const unifiedRaw = metrics && (metrics as Record<string, unknown>)['unified'];
            const unified = unifiedRaw && typeof unifiedRaw === 'object' ? unifiedRaw as Record<string, unknown> : undefined;
            const semanticRaw = unified && unified['semanticMap'];
            const semantic = semanticRaw && typeof semanticRaw === 'object' ? semanticRaw as Record<string, unknown> : undefined;
            const alertsRaw = root['alerts'];
            const alerts = Array.isArray(alertsRaw) ? alertsRaw as Array<{ type?: string; level?: string }> : [];
            return {
                adoption: getNumber(kpis && kpis['semanticMapAggregateAdoptionPct']),
                hits: getNumber(semantic && semantic['aggregateHits']),
                fallbacks: getNumber(semantic && semantic['legacyFallbacks']),
                alerts
            };
        };
        const baselineRes = await ctx.get('/api/health');
        await baselineRes.json(); // not used directly but triggers initial metrics
        // Push into mid warn range ~50-<80 with balanced increments
        await ctx.get('/api/test/metrics/semantic-map?hits=2&fallbacks=2');
        // Poll for KPI
        let midParsed = parseSemantic(await (await ctx.get('/api/health')).json());
        for (let i = 0; i < 6; i++) {
            if (midParsed.adoption >= 50) break;
            await new Promise(r2 => setTimeout(r2, 120));
            midParsed = parseSemantic(await (await ctx.get('/api/health')).json());
        }
        expect(midParsed.adoption).toBeGreaterThanOrEqual(50 - 0.0001);
        expect(midParsed.adoption).toBeLessThan(80);
        const warn = midParsed.alerts.find(a => a.type === 'semanticMapAggregateAdoption');
        expect(warn).toBeDefined();
        expect(warn && warn.level).toBe('warn');
        // Compute hits needed to exceed 80%
        const needed = Math.max(1, Math.ceil(((0.81 * midParsed.fallbacks) - (0.19 * midParsed.hits)) / 0.19));
        await ctx.get(`/api/test/metrics/semantic-map?hits=${needed}&fallbacks=0`);
        let highParsed = midParsed;
        for (let i = 0; i < 6; i++) {
            await new Promise(r2 => setTimeout(r2, 120));
            highParsed = parseSemantic(await (await ctx.get('/api/health')).json());
            if (highParsed.adoption > 80) break;
        }
        expect(highParsed.adoption).toBeGreaterThan(80);
        const cleared = highParsed.alerts.filter(a => a.type === 'semanticMapAggregateAdoption');
        expect(cleared.length).toBe(0);
    });
});
