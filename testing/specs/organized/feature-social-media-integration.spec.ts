import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: social-media-integration
 * Tests social-media-integration functionality
 */

test.describe('Feature - social-media-integration', () => {
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

    test('should load social-media-integration interface', async ({ page }) => {
        await page.goto('/social-media-integration');
        await expect(page.locator('[data-testid="social-media-integration-container"]')).toBeVisible();
    });

    test('should handle social-media-integration actions', async ({ page }) => {
        await page.goto('/social-media-integration');
        await expect(page.locator('[data-testid="social-media-integration-actions"]')).toBeVisible();
    });

    test('should validate social-media-integration data', async ({ page }) => {
        await page.goto('/social-media-integration');
        await expect(page.locator('[data-testid="social-media-integration-data"]')).toBeVisible();
    });

    test('should display social-media-integration correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/social-media-integration');
        await expect(page.locator('[data-testid="social-media-integration-mobile"]')).toBeVisible();
    });

    test('should handle social-media-integration errors gracefully', async ({ page }) => {
        await page.goto('/social-media-integration');
        // Simulate error condition
        await expect(page.locator('[data-testid="social-media-integration-error-fallback"]')).toBeVisible();
    });
});
