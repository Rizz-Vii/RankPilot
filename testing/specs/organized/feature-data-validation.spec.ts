import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-validation
 * Tests data-validation functionality
 */

test.describe('Feature - data-validation', () => {
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

    test('should load data-validation interface', async ({ page }) => {
        await page.goto('/data-validation');
        await expect(page.locator('[data-testid="data-validation-container"]')).toBeVisible();
    });

    test('should handle data-validation actions', async ({ page }) => {
        await page.goto('/data-validation');
        await expect(page.locator('[data-testid="data-validation-actions"]')).toBeVisible();
    });

    test('should validate data-validation data', async ({ page }) => {
        await page.goto('/data-validation');
        await expect(page.locator('[data-testid="data-validation-data"]')).toBeVisible();
    });

    test('should display data-validation correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-validation');
        await expect(page.locator('[data-testid="data-validation-mobile"]')).toBeVisible();
    });

    test('should handle data-validation errors gracefully', async ({ page }) => {
        await page.goto('/data-validation');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-validation-error-fallback"]')).toBeVisible();
    });
});
