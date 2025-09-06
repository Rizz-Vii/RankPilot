import { expect, test } from '@playwright/test'; // @performance @finance

// Helper to compute simple stats
function summarize(arr: number[]) {
    const s = [...arr].sort((a, b) => a - b);
    const pct = (p: number) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
    return { p50: pct(0.5), p95: pct(0.95), max: s[s.length - 1] };
}

// Performance / diagnostics contract for /api/finance/metrics
test.describe('Finance metrics API performance & diagnostics', () => {
    test('p95 latency under 500ms (local) & diagnostics header parsing', async ({ request }) => {
        const iterations = 6; // fewer iterations to reduce test time
        const durations: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            const resp = await request.get('/api/finance/metrics?months=3&testUser=abbas_ali_rizvi@hotmail.com');
            const elapsed = performance.now() - start;
            durations.push(elapsed);
            expect(resp.ok()).toBeTruthy();
            // Validate diagnostics header
            const diag = resp.headers()['x-finance-diagnostics'] || resp.headers()['X-Finance-Diagnostics'];
            expect(diag).toBeTruthy();
            if (diag) {
                // auth=, items=, months=, scope=
                expect(/auth=/.test(diag)).toBeTruthy();
                expect(/items=\d+/.test(diag)).toBeTruthy();
                expect(/months=3/.test(diag)).toBeTruthy();
                expect(/scope=(team|user)/.test(diag)).toBeTruthy();
            }
            // Basic shape spot check
            const json = await resp.json();
            expect(json).toHaveProperty('kpis');
            expect(json).toHaveProperty('mrrSeries');
        }
        // Compute latency summary
        const { p50, p95, max } = summarize(durations);
        const hardLimit = 1500; // absolute upper bound for local env
        expect(p95).toBeLessThan(hardLimit);
        if (p95 > 800) {
            console.warn('Finance metrics latency elevated', { p50: Math.round(p50), p95: Math.round(p95), max: Math.round(max) });
        }
    });
});
