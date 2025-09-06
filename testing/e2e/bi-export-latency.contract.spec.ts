import { expect, test } from '@playwright/test';

// Validates CSV export for latency corresponds to snapshot data subset
test.describe('BI Export latency CSV contract', () => {
    test('latency CSV contains snapshot latency routes', async ({ request }) => {
        const snapshotResp = await request.get('/api/bi/snapshot');
        expect(snapshotResp.ok()).toBeTruthy();
        const snap = await snapshotResp.json();
        const latency: Record<string, { count: number; totalMs: number; maxMs: number }> = snap.unified?.latency || {};

        const csvResp = await request.get('/api/bi/export?format=csv&kind=latency');
        expect(csvResp.ok()).toBeTruthy();
        const csvText = await csvResp.text();
        expect(csvText.startsWith('# latency')).toBeTruthy();
        // Extract lines after header until blank or next section
        const lines = csvText.split(/\r?\n/).filter(l => l && !l.startsWith('# latency'));
        // Skip header line 'route,count,totalMs,...'
        const dataLines = lines.filter(l => !/^route,/.test(l));
        const csvRoutes = new Set<string>();
        for (const line of dataLines) {
            const [route] = line.split(',');
            if (route) csvRoutes.add(route);
        }
        // Each CSV route must exist in snapshot latency
        for (const r of csvRoutes) {
            expect(Object.prototype.hasOwnProperty.call(latency, r)).toBeTruthy();
        }
    });
});
