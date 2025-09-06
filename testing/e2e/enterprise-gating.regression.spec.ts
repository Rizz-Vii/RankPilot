import { expect, test } from '@playwright/test'; // @rbac @gating

// Regression: enterprise project should NOT see upgrade banners on enterprise-only feature pages
test.describe('Enterprise gating regression', () => {
    test('enterprise user sees white-label page without upgrade markers', async ({ page }) => {
        const isEnterpriseProject = /enterprise/i.test(test.info().project.name || '');
        if (!isEnterpriseProject) test.skip();
        await page.goto('/settings/branding', { waitUntil: 'domcontentloaded' });
        // Absence of upgrade or denied markers
        const upgradeBanner = page.getByTestId('upgrade-banner');
        const denied = page.getByTestId('feature-gate-denied');
        await expect(upgradeBanner).toHaveCount(0);
        await expect(denied).toHaveCount(0);
        // Expect core heading visible
        await expect(page.getByRole('heading', { name: /white-label/i })).toBeVisible();
    });
});
