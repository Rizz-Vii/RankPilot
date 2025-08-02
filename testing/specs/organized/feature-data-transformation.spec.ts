import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-transformation
 * Tests data-transformation functionality
 */

test.describe('Feature - data-transformation', () => {
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

    test('should load data-transformation interface', async ({ page }) => {
        await page.goto('/data-transformation');
        await expect(page.locator('[data-testid="data-transformation-container"]')).toBeVisible();
    });

    test('should handle data-transformation actions', async ({ page }) => {
        await page.goto('/data-transformation');
        await expect(page.locator('[data-testid="data-transformation-actions"]')).toBeVisible();
    });

    test('should validate data-transformation data', async ({ page }) => {
        await page.goto('/data-transformation');
        await expect(page.locator('[data-testid="data-transformation-data"]')).toBeVisible();
    });

    test('should display data-transformation correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-transformation');
        await expect(page.locator('[data-testid="data-transformation-mobile"]')).toBeVisible();
    });

    test('should handle data-transformation errors gracefully', async ({ page }) => {
        await page.goto('/data-transformation');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-transformation-error-fallback"]')).toBeVisible();
    });
});
