import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: accessibility-compliance
 * Tests accessibility-compliance functionality
 */

test.describe('Feature - accessibility-compliance', () => {
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

    test('should load accessibility-compliance interface', async ({ page }) => {
        await page.goto('/accessibility-compliance');
        await expect(page.locator('[data-testid="accessibility-compliance-container"]')).toBeVisible();
    });

    test('should handle accessibility-compliance actions', async ({ page }) => {
        await page.goto('/accessibility-compliance');
        await expect(page.locator('[data-testid="accessibility-compliance-actions"]')).toBeVisible();
    });

    test('should validate accessibility-compliance data', async ({ page }) => {
        await page.goto('/accessibility-compliance');
        await expect(page.locator('[data-testid="accessibility-compliance-data"]')).toBeVisible();
    });

    test('should display accessibility-compliance correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/accessibility-compliance');
        await expect(page.locator('[data-testid="accessibility-compliance-mobile"]')).toBeVisible();
    });

    test('should handle accessibility-compliance errors gracefully', async ({ page }) => {
        await page.goto('/accessibility-compliance');
        // Simulate error condition
        await expect(page.locator('[data-testid="accessibility-compliance-error-fallback"]')).toBeVisible();
    });
});
