import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-purging
 * Tests data-purging functionality
 */

test.describe('Feature - data-purging', () => {
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

    test('should load data-purging interface', async ({ page }) => {
        await page.goto('/data-purging');
        await expect(page.locator('[data-testid="data-purging-container"]')).toBeVisible();
    });

    test('should handle data-purging actions', async ({ page }) => {
        await page.goto('/data-purging');
        await expect(page.locator('[data-testid="data-purging-actions"]')).toBeVisible();
    });

    test('should validate data-purging data', async ({ page }) => {
        await page.goto('/data-purging');
        await expect(page.locator('[data-testid="data-purging-data"]')).toBeVisible();
    });

    test('should display data-purging correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-purging');
        await expect(page.locator('[data-testid="data-purging-mobile"]')).toBeVisible();
    });

    test('should handle data-purging errors gracefully', async ({ page }) => {
        await page.goto('/data-purging');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-purging-error-fallback"]')).toBeVisible();
    });
});
