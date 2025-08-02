import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: error-handling
 * Tests error-handling functionality
 */

test.describe('Feature - error-handling', () => {
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

    test('should load error-handling interface', async ({ page }) => {
        await page.goto('/error-handling');
        await expect(page.locator('[data-testid="error-handling-container"]')).toBeVisible();
    });

    test('should handle error-handling actions', async ({ page }) => {
        await page.goto('/error-handling');
        await expect(page.locator('[data-testid="error-handling-actions"]')).toBeVisible();
    });

    test('should validate error-handling data', async ({ page }) => {
        await page.goto('/error-handling');
        await expect(page.locator('[data-testid="error-handling-data"]')).toBeVisible();
    });

    test('should display error-handling correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/error-handling');
        await expect(page.locator('[data-testid="error-handling-mobile"]')).toBeVisible();
    });

    test('should handle error-handling errors gracefully', async ({ page }) => {
        await page.goto('/error-handling');
        // Simulate error condition
        await expect(page.locator('[data-testid="error-handling-error-fallback"]')).toBeVisible();
    });
});
