import { test, expect } from '@playwright/test';

// Enhanced: deterministically seed an alert snapshot via test endpoint then assert row presence & filtering.
// Previous simpler version only checked table presence contingent on existing alerts.

test.describe('@observability Observability Alert History', () => {
    test('seeds alert snapshot & displays alert history row', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', 'admin@rankpilot.com');
        await page.fill('#password', 'admin123');
        await page.press('#password', 'Enter');
        await page.waitForURL(/dashboard|app/, { timeout: 20000 }).catch(() => { });

        const seed = await page.request.get('/api/test/observability/seed-alert?type=provenanceCoverage&level=warn&value=95&ma7=96');
        if (!seed.ok()) test.skip(true, 'Seeding endpoint unavailable (production environment)');

        await page.goto('/admin/observability');
        await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();

        const filter = page.locator('[data-testid="alert-filter"]');
        await filter.waitFor({ timeout: 5000 }).catch(() => { });

        const rows = page.locator('table tbody tr');
        await page.waitForTimeout(600);
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);

        const provenanceCell = rows.locator('td').filter({ hasText: 'provenanceCoverage' }).first();
        await expect(provenanceCell).toBeVisible();

        if (await filter.count()) {
            const before = count;
            await filter.selectOption('provenanceCoverage');
            await page.waitForTimeout(300);
            const after = await rows.count();
            expect(after).toBeLessThanOrEqual(before);
        }
    });
});
