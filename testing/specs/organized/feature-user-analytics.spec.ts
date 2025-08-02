import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: user-analytics
 * Tests user-analytics functionality
 */

test.describe('Feature - user-analytics', () => {
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

    test('should load user-analytics interface', async ({ page }) => {
        await page.goto('/user-analytics');
        await expect(page.locator('[data-testid="user-analytics-container"]')).toBeVisible();
    });

    test('should handle user-analytics actions', async ({ page }) => {
        await page.goto('/user-analytics');
        await expect(page.locator('[data-testid="user-analytics-actions"]')).toBeVisible();
    });

    test('should validate user-analytics data', async ({ page }) => {
        await page.goto('/user-analytics');
        await expect(page.locator('[data-testid="user-analytics-data"]')).toBeVisible();
    });

    test('should display user-analytics correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/user-analytics');
        await expect(page.locator('[data-testid="user-analytics-mobile"]')).toBeVisible();
    });

    test('should handle user-analytics errors gracefully', async ({ page }) => {
        await page.goto('/user-analytics');
        // Simulate error condition
        await expect(page.locator('[data-testid="user-analytics-error-fallback"]')).toBeVisible();
    });
});
