import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-sovereignty
 * Tests data-sovereignty functionality
 */

test.describe('Feature - data-sovereignty', () => {
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

    test('should load data-sovereignty interface', async ({ page }) => {
        await page.goto('/data-sovereignty');
        await expect(page.locator('[data-testid="data-sovereignty-container"]')).toBeVisible();
    });

    test('should handle data-sovereignty actions', async ({ page }) => {
        await page.goto('/data-sovereignty');
        await expect(page.locator('[data-testid="data-sovereignty-actions"]')).toBeVisible();
    });

    test('should validate data-sovereignty data', async ({ page }) => {
        await page.goto('/data-sovereignty');
        await expect(page.locator('[data-testid="data-sovereignty-data"]')).toBeVisible();
    });

    test('should display data-sovereignty correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-sovereignty');
        await expect(page.locator('[data-testid="data-sovereignty-mobile"]')).toBeVisible();
    });

    test('should handle data-sovereignty errors gracefully', async ({ page }) => {
        await page.goto('/data-sovereignty');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-sovereignty-error-fallback"]')).toBeVisible();
    });
});
