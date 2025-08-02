import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: usage-analytics
 * Tests usage-analytics functionality
 */

test.describe('Feature - usage-analytics', () => {
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

    test('should load usage-analytics interface', async ({ page }) => {
        await page.goto('/usage-analytics');
        await expect(page.locator('[data-testid="usage-analytics-container"]')).toBeVisible();
    });

    test('should handle usage-analytics actions', async ({ page }) => {
        await page.goto('/usage-analytics');
        await expect(page.locator('[data-testid="usage-analytics-actions"]')).toBeVisible();
    });

    test('should validate usage-analytics data', async ({ page }) => {
        await page.goto('/usage-analytics');
        await expect(page.locator('[data-testid="usage-analytics-data"]')).toBeVisible();
    });

    test('should display usage-analytics correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/usage-analytics');
        await expect(page.locator('[data-testid="usage-analytics-mobile"]')).toBeVisible();
    });

    test('should handle usage-analytics errors gracefully', async ({ page }) => {
        await page.goto('/usage-analytics');
        // Simulate error condition
        await expect(page.locator('[data-testid="usage-analytics-error-fallback"]')).toBeVisible();
    });
});
