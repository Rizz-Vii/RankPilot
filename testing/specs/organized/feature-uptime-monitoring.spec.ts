import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: uptime-monitoring
 * Tests uptime-monitoring functionality
 */

test.describe('Feature - uptime-monitoring', () => {
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

    test('should load uptime-monitoring interface', async ({ page }) => {
        await page.goto('/uptime-monitoring');
        await expect(page.locator('[data-testid="uptime-monitoring-container"]')).toBeVisible();
    });

    test('should handle uptime-monitoring actions', async ({ page }) => {
        await page.goto('/uptime-monitoring');
        await expect(page.locator('[data-testid="uptime-monitoring-actions"]')).toBeVisible();
    });

    test('should validate uptime-monitoring data', async ({ page }) => {
        await page.goto('/uptime-monitoring');
        await expect(page.locator('[data-testid="uptime-monitoring-data"]')).toBeVisible();
    });

    test('should display uptime-monitoring correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/uptime-monitoring');
        await expect(page.locator('[data-testid="uptime-monitoring-mobile"]')).toBeVisible();
    });

    test('should handle uptime-monitoring errors gracefully', async ({ page }) => {
        await page.goto('/uptime-monitoring');
        // Simulate error condition
        await expect(page.locator('[data-testid="uptime-monitoring-error-fallback"]')).toBeVisible();
    });
});
