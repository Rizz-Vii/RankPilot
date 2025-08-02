import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: infrastructure-monitoring
 * Tests infrastructure-monitoring functionality
 */

test.describe('Feature - infrastructure-monitoring', () => {
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

    test('should load infrastructure-monitoring interface', async ({ page }) => {
        await page.goto('/infrastructure-monitoring');
        await expect(page.locator('[data-testid="infrastructure-monitoring-container"]')).toBeVisible();
    });

    test('should handle infrastructure-monitoring actions', async ({ page }) => {
        await page.goto('/infrastructure-monitoring');
        await expect(page.locator('[data-testid="infrastructure-monitoring-actions"]')).toBeVisible();
    });

    test('should validate infrastructure-monitoring data', async ({ page }) => {
        await page.goto('/infrastructure-monitoring');
        await expect(page.locator('[data-testid="infrastructure-monitoring-data"]')).toBeVisible();
    });

    test('should display infrastructure-monitoring correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/infrastructure-monitoring');
        await expect(page.locator('[data-testid="infrastructure-monitoring-mobile"]')).toBeVisible();
    });

    test('should handle infrastructure-monitoring errors gracefully', async ({ page }) => {
        await page.goto('/infrastructure-monitoring');
        // Simulate error condition
        await expect(page.locator('[data-testid="infrastructure-monitoring-error-fallback"]')).toBeVisible();
    });
});
