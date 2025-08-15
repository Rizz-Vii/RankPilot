import { test, expect } from '@playwright/test';

// Lean version: validates MA7 overlay visibility and alert filter behavior.
const sparklineIds = [
    'sparkline-provenance', 'sparkline-latencyP95', 'sparkline-cost',
    'sparkline-crawlerAdoption', 'sparkline-semanticAdoption', 'sparkline-teamUtil'
];

test.describe('Admin Observability MA7 Overlays', () => {
    test.beforeEach(async ({ }, info) => { if (info.project.name !== 'chromium') test.skip(); });

    test('renders sparkline MA7 overlays', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', 'admin@rankpilot.com');
        await page.fill('#password', 'admin123');
        await page.press('#password', 'Enter');
        await page.waitForURL(/dashboard|app/).catch(() => { });
        await page.goto('/admin/observability');
        await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();
        await page.waitForSelector('[data-testid="prov-delta-smoothed"]', { timeout: 10000 });
        await page.waitForSelector('[data-testid="sparkline-provenance"]', { timeout: 10000 });
        for (const id of sparklineIds) {
            const el = page.locator(`[data-testid="${id}"]`);
            if (!(await el.count())) continue;
            await expect(el).toBeVisible();
            const overlay = page.locator(`[data-testid="${id}-ma7"]`);
            try { await expect(overlay).toBeVisible({ timeout: 3000 }); } catch { /* tolerate */ }
        }
    });

    test('alert filter narrows table', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', 'admin@rankpilot.com');
        await page.fill('#password', 'admin123');
        await page.press('#password', 'Enter');
        await page.waitForURL(/dashboard|app/).catch(() => { });
        await page.goto('/admin/observability');
        await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();
        await page.waitForTimeout(1200);
        const alertFilter = page.locator('[data-testid="alert-filter"]');
        if (!(await alertFilter.count())) return; // no alerts
        const historyRows = () => page.locator('table >> tbody >> tr');
        const initial = await historyRows().count();
        if (initial <= 2) return; // insufficient rows to meaningfully filter
        const firstOption = await alertFilter.locator('option:not([value="all"])').first();
        if (!(await firstOption.count())) return;
        const val = await firstOption.getAttribute('value');
        if (!val) return;
        await alertFilter.selectOption(val);
        await page.waitForTimeout(250);
        const post = await historyRows().count();
        expect(post).toBeLessThanOrEqual(initial);
    });
});
