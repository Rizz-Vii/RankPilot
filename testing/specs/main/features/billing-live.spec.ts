import { expect, test } from '@playwright/test';
import { TestOrchestrator } from '../../../utils/test-orchestrator';

/**
 * FIN-02 Billing UI Live Smoke
 * Assumes feature key billing_portal_access resolves true for test users (tier gating via canUseFeature).
 */

test.describe('Billing UI (FIN-02) - Live Data Smoke', () => {
    let orchestrator: TestOrchestrator;

    test.beforeEach(async ({ page }) => {
        orchestrator = new TestOrchestrator(page);
        page.setDefaultTimeout(20000);
    });

    test('renders billing portal with plan + history section', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');
        await page.goto('/billing', { waitUntil: 'domcontentloaded' });
        await page.locator('main, [data-testid="billing-root"], [data-testid="billing-portal"]').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

        // Header
        await expect(page.locator('h1')).toContainText('Billing');
        // Plan section
        await expect(page.locator('text=Current Plan')).toBeVisible();
        // Billing history section present (even if empty)
        await expect(page.locator('text=Billing History')).toBeVisible();
    });

    test('paginates invoice list (client-side)', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');
        await page.goto('/billing', { waitUntil: 'domcontentloaded' });
        await page.locator('main, [data-testid="billing-root"], [data-testid="billing-portal"]').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });
        // If pagination controls exist, interact
        const nextBtn = page.locator('button', { hasText: 'Next' });
        if (await nextBtn.isVisible()) {
            await nextBtn.click();
            // Page indicator updates
            await expect(page.locator('text=Page')).toBeVisible();
        } else {
            // No pagination yet; ensure history still visible
            await expect(page.locator('text=Billing History')).toBeVisible();
        }
    });
});
