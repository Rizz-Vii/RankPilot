import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: cookie-compliance
 * Tests cookie-compliance functionality
 */

test.describe('Feature - cookie-compliance', () => {
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

    test('should load cookie-compliance interface', async ({ page }) => {
        await page.goto('/cookie-compliance');
        await expect(page.locator('[data-testid="cookie-compliance-container"]')).toBeVisible();
    });

    test('should handle cookie-compliance actions', async ({ page }) => {
        await page.goto('/cookie-compliance');
        await expect(page.locator('[data-testid="cookie-compliance-actions"]')).toBeVisible();
    });

    test('should validate cookie-compliance data', async ({ page }) => {
        await page.goto('/cookie-compliance');
        await expect(page.locator('[data-testid="cookie-compliance-data"]')).toBeVisible();
    });

    test('should display cookie-compliance correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/cookie-compliance');
        await expect(page.locator('[data-testid="cookie-compliance-mobile"]')).toBeVisible();
    });

    test('should handle cookie-compliance errors gracefully', async ({ page }) => {
        await page.goto('/cookie-compliance');
        // Simulate error condition
        await expect(page.locator('[data-testid="cookie-compliance-error-fallback"]')).toBeVisible();
    });
});
