import { test, expect } from '@playwright/test';

// Smoke test: Admin Observability page loads and key KPI labels render
// Assumes admin test user credentials available via existing helper.

test.describe('Admin Observability Dashboard', () => {
    test.beforeEach(async ({ }, testInfo) => {
        if (testInfo.project.name !== 'chromium') {
            test.skip();
        }
    });
    test('loads and shows core KPI labels', async ({ page }) => {

        // Inline admin login (minimal + deterministic)
        await page.goto('/login');
        await page.fill('#email', 'admin@rankpilot.com');
        await page.fill('#password', 'admin123');
        // Prefer pressing Enter to avoid selector drift
        await page.press('#password', 'Enter');
        // Wait for dashboard (fallback 2nd attempt)
        await page.waitForURL(/dashboard|app/, { timeout: 20000 }).catch(() => { });

        await page.goto('/admin/observability');
        await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();
        await expect(page.getByText('Provenance Coverage')).toBeVisible();
        await expect(page.getByText('Crawler P95')).toBeVisible();
        await expect(page.getByText('SemanticMap Adoption %')).toBeVisible();
        await expect(page.getByText('AI Daily Cost')).toBeVisible();
    });
});
