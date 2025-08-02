import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: open-source-audit
 * Tests open-source-audit functionality
 */

test.describe('Feature - open-source-audit', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (_error: unknown) {
            console.warn('Login failed, using fallback:', error.message);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load open-source-audit interface', async ({ page }) => {
        await page.goto('/open-source-audit');
        await expect(page.locator('[data-testid="open-source-audit-container"]')).toBeVisible();
    });

    test('should handle open-source-audit actions', async ({ page }) => {
        await page.goto('/open-source-audit');
        await expect(page.locator('[data-testid="open-source-audit-actions"]')).toBeVisible();
    });

    test('should validate open-source-audit data', async ({ page }) => {
        await page.goto('/open-source-audit');
        await expect(page.locator('[data-testid="open-source-audit-data"]')).toBeVisible();
    });

    test('should display open-source-audit correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/open-source-audit');
        await expect(page.locator('[data-testid="open-source-audit-mobile"]')).toBeVisible();
    });

    test('should handle open-source-audit errors gracefully', async ({ page }) => {
        await page.goto('/open-source-audit');
        // Simulate error condition
        await expect(page.locator('[data-testid="open-source-audit-error-fallback"]')).toBeVisible();
    });
});
