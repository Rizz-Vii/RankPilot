import { expect, request, test } from '@playwright/test';

// Verifies crawler aggregate adoption KPI & alert thresholds.
// Thresholds: critical <50, warn 50-<80, no alert >=80

test.describe('Health API crawler aggregate adoption alerts', () => {
    test('adoption alert transitions warn -> cleared', async () => {
        const ctx = await request.newContext();
        // Seed equal hits & fallbacks => adoption 50% (warn)
        await ctx.get('/api/test/metrics/crawler?hits=2&fallbacks=2');
        let res = await ctx.get('/api/health');
        expect(res.ok()).toBeTruthy();
        let body = await res.json();
        expect(body.kpis).toBeDefined();
        expect(body.kpis.crawlerAggregateAdoptionPct).toBeGreaterThan(0);
        expect(body.kpis.crawlerAggregateAdoptionPct).toBeCloseTo(50, 1);
        interface Alert { type: string; level: string }
        const alerts = Array.isArray((body as { alerts?: unknown }).alerts) ? (body.alerts as unknown[]) : [];
        const warnAlert = alerts.find(a => typeof a === 'object' && a !== null && (a as Partial<Alert>).type === 'crawlerAggregateAdoption') as Alert | undefined;
        expect(warnAlert).toBeDefined();
        if (warnAlert) {
            expect(warnAlert.level).toBe('warn');
        }

        // Increase hits to push adoption above 80% (add 14 hits: total hits 16 fallbacks 2 => 88.89%)
        await ctx.get('/api/test/metrics/crawler?hits=14&fallbacks=0');
        res = await ctx.get('/api/health');
        body = await res.json();
        expect(body.kpis.crawlerAggregateAdoptionPct).toBeGreaterThan(80);
        const adoptionAlerts = alerts.filter(a => typeof a === 'object' && a !== null && (a as Partial<Alert>).type === 'crawlerAggregateAdoption') as Alert[];
        expect(adoptionAlerts.length).toBe(0); // no alert at high adoption
    });
});
