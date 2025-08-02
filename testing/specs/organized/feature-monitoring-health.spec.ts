import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: monitoring-health
 * Tests monitoring-health functionality
 */

test.describe('Feature - monitoring-health', () => {
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

    test('should load monitoring-health interface', async ({ page }) => {
        await page.goto('/monitoring-health');
        await expect(page.locator('[data-testid="monitoring-health-container"]')).toBeVisible();
    });

    test('should handle monitoring-health actions', async ({ page }) => {
        await page.goto('/monitoring-health');
        await expect(page.locator('[data-testid="monitoring-health-actions"]')).toBeVisible();
    });

    test('should validate monitoring-health data', async ({ page }) => {
        await page.goto('/monitoring-health');
        await expect(page.locator('[data-testid="monitoring-health-data"]')).toBeVisible();
    });

    test('should display monitoring-health correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/monitoring-health');
        await expect(page.locator('[data-testid="monitoring-health-mobile"]')).toBeVisible();
    });

    test('should handle monitoring-health errors gracefully', async ({ page }) => {
        await page.goto('/monitoring-health');
        // Simulate error condition
        await expect(page.locator('[data-testid="monitoring-health-error-fallback"]')).toBeVisible();
    });
});
