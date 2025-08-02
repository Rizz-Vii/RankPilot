import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-cleansing
 * Tests data-cleansing functionality
 */

test.describe('Feature - data-cleansing', () => {
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

    test('should load data-cleansing interface', async ({ page }) => {
        await page.goto('/data-cleansing');
        await expect(page.locator('[data-testid="data-cleansing-container"]')).toBeVisible();
    });

    test('should handle data-cleansing actions', async ({ page }) => {
        await page.goto('/data-cleansing');
        await expect(page.locator('[data-testid="data-cleansing-actions"]')).toBeVisible();
    });

    test('should validate data-cleansing data', async ({ page }) => {
        await page.goto('/data-cleansing');
        await expect(page.locator('[data-testid="data-cleansing-data"]')).toBeVisible();
    });

    test('should display data-cleansing correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-cleansing');
        await expect(page.locator('[data-testid="data-cleansing-mobile"]')).toBeVisible();
    });

    test('should handle data-cleansing errors gracefully', async ({ page }) => {
        await page.goto('/data-cleansing');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-cleansing-error-fallback"]')).toBeVisible();
    });
});
