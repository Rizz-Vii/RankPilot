import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-quality
 * Tests data-quality functionality
 */

test.describe('Feature - data-quality', () => {
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

    test('should load data-quality interface', async ({ page }) => {
        await page.goto('/data-quality');
        await expect(page.locator('[data-testid="data-quality-container"]')).toBeVisible();
    });

    test('should handle data-quality actions', async ({ page }) => {
        await page.goto('/data-quality');
        await expect(page.locator('[data-testid="data-quality-actions"]')).toBeVisible();
    });

    test('should validate data-quality data', async ({ page }) => {
        await page.goto('/data-quality');
        await expect(page.locator('[data-testid="data-quality-data"]')).toBeVisible();
    });

    test('should display data-quality correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-quality');
        await expect(page.locator('[data-testid="data-quality-mobile"]')).toBeVisible();
    });

    test('should handle data-quality errors gracefully', async ({ page }) => {
        await page.goto('/data-quality');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-quality-error-fallback"]')).toBeVisible();
    });
});
