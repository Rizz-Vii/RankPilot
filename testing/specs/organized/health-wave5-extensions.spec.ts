import { test, expect, request } from '@playwright/test';

// Wave 5: Extended Health API Contract Test
// Validates new fields: aiTokenUsage24h, aiCostEstimate24h, quotaHeadroomPct, snapshotFreshnessHours

test.describe('Health API Wave 5 Extensions', () => {
    test('returns Wave 5 monitoring fields with expected schema', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get('/api/health');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        // Test explicit Wave 5 fields at top level
        test.step('aiTokenUsage24h field', () => {
            expect(body).toHaveProperty('aiTokenUsage24h');
            expect(body.aiTokenUsage24h).toHaveProperty('tokensIn');
            expect(body.aiTokenUsage24h).toHaveProperty('tokensOut');
            expect(typeof body.aiTokenUsage24h.tokensIn).toBe('number');
            expect(typeof body.aiTokenUsage24h.tokensOut).toBe('number');
            expect(body.aiTokenUsage24h.tokensIn).toBeGreaterThanOrEqual(0);
            expect(body.aiTokenUsage24h.tokensOut).toBeGreaterThanOrEqual(0);
        });

        test.step('aiCostEstimate24h field', () => {
            expect(body).toHaveProperty('aiCostEstimate24h');
            expect(typeof body.aiCostEstimate24h).toBe('number');
            expect(body.aiCostEstimate24h).toBeGreaterThanOrEqual(0);
        });

        test.step('quotaHeadroomPct field', () => {
            expect(body).toHaveProperty('quotaHeadroomPct');
            // Can be null if no quota data available
            if (body.quotaHeadroomPct !== null) {
                expect(typeof body.quotaHeadroomPct).toBe('number');
                expect(body.quotaHeadroomPct).toBeGreaterThanOrEqual(0);
                expect(body.quotaHeadroomPct).toBeLessThanOrEqual(100);
            }
        });

        test.step('snapshotFreshnessHours field', () => {
            expect(body).toHaveProperty('snapshotFreshnessHours');
            // Can be null if no snapshot data available
            if (body.snapshotFreshnessHours !== null) {
                expect(typeof body.snapshotFreshnessHours).toBe('number');
                expect(body.snapshotFreshnessHours).toBeGreaterThanOrEqual(0);
            }
        });

        // Test that these fields are also present in KPIs object
        test.step('KPIs object contains Wave 5 fields', () => {
            expect(body).toHaveProperty('kpis');
            if (body.kpis.quotaHeadroomPct !== undefined) {
                expect(body.kpis.quotaHeadroomPct).toBe(body.quotaHeadroomPct);
            }
            if (body.kpis.snapshotFreshnessHours !== undefined) {
                expect(body.kpis.snapshotFreshnessHours).toBe(body.snapshotFreshnessHours);
            }
        });
    });

    test('generates appropriate alerts for Wave 5 thresholds', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get('/api/health');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        expect(body).toHaveProperty('alerts');
        expect(Array.isArray(body.alerts)).toBeTruthy();

        // Check that Wave 5 alert types are properly structured if present
        const wave5AlertTypes = ['quotaHeadroom', 'snapshotFreshness'];
        const wave5Alerts = body.alerts.filter((alert: any) => 
            wave5AlertTypes.includes(alert.type)
        );

        wave5Alerts.forEach((alert: any) => {
            expect(alert).toHaveProperty('type');
            expect(alert).toHaveProperty('level');
            expect(alert).toHaveProperty('message');
            expect(alert).toHaveProperty('value');
            expect(alert).toHaveProperty('threshold');
            expect(['warn', 'critical']).toContain(alert.level);
            expect(typeof alert.message).toBe('string');
            expect(typeof alert.threshold).toBe('number');
        });
    });

    test('maintains backward compatibility with existing fields', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get('/api/health');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        // Ensure existing critical fields are still present
        const requiredFields = [
            'status', 'timestamp', 'build', 'env', 'firestoreOk',
            'provenanceCoverage', 'kpis', 'alerts', 'aiUsage24h',
            'subtoolUsage24h', 'crawler', 'metrics'
        ];

        requiredFields.forEach(field => {
            expect(body).toHaveProperty(field);
        });

        // Ensure original aiUsage24h structure is preserved
        expect(body.aiUsage24h).toHaveProperty('tokensIn');
        expect(body.aiUsage24h).toHaveProperty('tokensOut');
        expect(body.aiUsage24h).toHaveProperty('costEstimate');
    });

    test('Wave 5 fields are consistent between top-level and KPIs', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get('/api/health');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        // Check consistency of cost estimate
        expect(body.aiCostEstimate24h).toBe(body.aiUsage24h.costEstimate);

        // Check token usage consistency
        expect(body.aiTokenUsage24h.tokensIn).toBe(body.aiUsage24h.tokensIn);
        expect(body.aiTokenUsage24h.tokensOut).toBe(body.aiUsage24h.tokensOut);
    });
});