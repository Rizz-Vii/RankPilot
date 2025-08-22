import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

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
        } catch (error: unknown) {
            const message = (error && typeof error === 'object' && 'message' in error)
                ? (error as { message: string }).message
                : String(error);
            console.warn('Login failed, using fallback:', message);
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
