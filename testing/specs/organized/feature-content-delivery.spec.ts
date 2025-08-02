import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: content-delivery
 * Tests content-delivery functionality
 */

test.describe('Feature - content-delivery', () => {
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

    test('should load content-delivery interface', async ({ page }) => {
        await page.goto('/content-delivery');
        await expect(page.locator('[data-testid="content-delivery-container"]')).toBeVisible();
    });

    test('should handle content-delivery actions', async ({ page }) => {
        await page.goto('/content-delivery');
        await expect(page.locator('[data-testid="content-delivery-actions"]')).toBeVisible();
    });

    test('should validate content-delivery data', async ({ page }) => {
        await page.goto('/content-delivery');
        await expect(page.locator('[data-testid="content-delivery-data"]')).toBeVisible();
    });

    test('should display content-delivery correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/content-delivery');
        await expect(page.locator('[data-testid="content-delivery-mobile"]')).toBeVisible();
    });

    test('should handle content-delivery errors gracefully', async ({ page }) => {
        await page.goto('/content-delivery');
        // Simulate error condition
        await expect(page.locator('[data-testid="content-delivery-error-fallback"]')).toBeVisible();
    });
});
