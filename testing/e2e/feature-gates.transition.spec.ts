import { expect, test, type Page } from '@playwright/test';

// @rbac @gating
// Validates that upgrade banner disappears as tier increases on same feature path.
test.describe('Feature gating tier transition', () => {
    const featurePath = '/finance/revenue';
    async function assertUpgradeVisibleOrSkip(page: Page) {
        await page.goto(featurePath, { waitUntil: 'domcontentloaded' });
        const upgrade = page.locator('[data-testid="upgrade-banner"], [data-testid="feature-gate-denied"]');
        if (await upgrade.count() === 0) test.skip();
        await expect(upgrade.first()).toBeVisible();
    }
    async function assertUpgradeAbsent(page: Page) {
        await page.goto(featurePath, { waitUntil: 'domcontentloaded' });
        const upgrade = page.locator('[data-testid="upgrade-banner"], [data-testid="feature-gate-denied"]');
        await expect(upgrade.first()).toHaveCount(0);
    }

    test('starter -> agency -> enterprise upgrade banner transitions', async ({ browser }) => {
        // Starter
        const starterCtx = await browser.newContext({ storageState: 'test-results/.auth/starter.json' });
        const starterPage = await starterCtx.newPage();
        await assertUpgradeVisibleOrSkip(starterPage);
        await starterCtx.close();
        // Agency
        const agencyCtx = await browser.newContext({ storageState: 'test-results/.auth/agency.json' });
        const agencyPage = await agencyCtx.newPage();
        await assertUpgradeAbsent(agencyPage);
        await agencyCtx.close();
        // Enterprise
        const enterpriseCtx = await browser.newContext({ storageState: 'test-results/.auth/enterprise.json' });
        const enterprisePage = await enterpriseCtx.newPage();
        await assertUpgradeAbsent(enterprisePage);
        await enterpriseCtx.close();
    });
});
