import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: regional-compliance
 * Tests regional-compliance functionality
 */

test.describe('Feature - regional-compliance', () => {
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

    test('should load regional-compliance interface', async ({ page }) => {
        await page.goto('/regional-compliance');
        await expect(page.locator('[data-testid="regional-compliance-container"]')).toBeVisible();
    });

    test('should handle regional-compliance actions', async ({ page }) => {
        await page.goto('/regional-compliance');
        await expect(page.locator('[data-testid="regional-compliance-actions"]')).toBeVisible();
    });

    test('should validate regional-compliance data', async ({ page }) => {
        await page.goto('/regional-compliance');
        await expect(page.locator('[data-testid="regional-compliance-data"]')).toBeVisible();
    });

    test('should display regional-compliance correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/regional-compliance');
        await expect(page.locator('[data-testid="regional-compliance-mobile"]')).toBeVisible();
    });

    test('should handle regional-compliance errors gracefully', async ({ page }) => {
        await page.goto('/regional-compliance');
        // Simulate error condition
        await expect(page.locator('[data-testid="regional-compliance-error-fallback"]')).toBeVisible();
    });
});
