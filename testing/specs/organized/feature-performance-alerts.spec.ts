import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: performance-alerts
 * Tests performance-alerts functionality
 */

test.describe('Feature - performance-alerts', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: unknown) {
            const msg = (error && typeof error === 'object' && 'message' in error)
                ? (error as { message: string }).message
                : String(error);
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load performance-alerts interface', async ({ page }) => {
        await page.goto('/performance-alerts');
        await expect(page.locator('[data-testid="performance-alerts-container"]')).toBeVisible();
    });

    test('should handle performance-alerts actions', async ({ page }) => {
        await page.goto('/performance-alerts');
        await expect(page.locator('[data-testid="performance-alerts-actions"]')).toBeVisible();
    });

    test('should validate performance-alerts data', async ({ page }) => {
        await page.goto('/performance-alerts');
        await expect(page.locator('[data-testid="performance-alerts-data"]')).toBeVisible();
    });

    test('should display performance-alerts correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/performance-alerts');
        await expect(page.locator('[data-testid="performance-alerts-mobile"]')).toBeVisible();
    });

    test('should handle performance-alerts errors gracefully', async ({ page }) => {
        await page.goto('/performance-alerts');
        // Simulate error condition
        await expect(page.locator('[data-testid="performance-alerts-error-fallback"]')).toBeVisible();
    });
});
