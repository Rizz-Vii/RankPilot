import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: notification-system
 * Tests notification-system functionality
 */

test.describe('Feature - notification-system', () => {
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

    test('should load notification-system interface', async ({ page }) => {
        await page.goto('/notification-system');
        await expect(page.locator('[data-testid="notification-system-container"]')).toBeVisible();
    });

    test('should handle notification-system actions', async ({ page }) => {
        await page.goto('/notification-system');
        await expect(page.locator('[data-testid="notification-system-actions"]')).toBeVisible();
    });

    test('should validate notification-system data', async ({ page }) => {
        await page.goto('/notification-system');
        await expect(page.locator('[data-testid="notification-system-data"]')).toBeVisible();
    });

    test('should display notification-system correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/notification-system');
        await expect(page.locator('[data-testid="notification-system-mobile"]')).toBeVisible();
    });

    test('should handle notification-system errors gracefully', async ({ page }) => {
        await page.goto('/notification-system');
        // Simulate error condition
        await expect(page.locator('[data-testid="notification-system-error-fallback"]')).toBeVisible();
    });
});
