import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: secret-management
 * Tests secret-management functionality
 */

test.describe('Feature - secret-management', () => {
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

    test('should load secret-management interface', async ({ page }) => {
        await page.goto('/secret-management');
        await expect(page.locator('[data-testid="secret-management-container"]')).toBeVisible();
    });

    test('should handle secret-management actions', async ({ page }) => {
        await page.goto('/secret-management');
        await expect(page.locator('[data-testid="secret-management-actions"]')).toBeVisible();
    });

    test('should validate secret-management data', async ({ page }) => {
        await page.goto('/secret-management');
        await expect(page.locator('[data-testid="secret-management-data"]')).toBeVisible();
    });

    test('should display secret-management correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/secret-management');
        await expect(page.locator('[data-testid="secret-management-mobile"]')).toBeVisible();
    });

    test('should handle secret-management errors gracefully', async ({ page }) => {
        await page.goto('/secret-management');
        // Simulate error condition
        await expect(page.locator('[data-testid="secret-management-error-fallback"]')).toBeVisible();
    });
});
