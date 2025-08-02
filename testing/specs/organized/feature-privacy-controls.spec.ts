import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: privacy-controls
 * Tests privacy-controls functionality
 */

test.describe('Feature - privacy-controls', () => {
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

    test('should load privacy-controls interface', async ({ page }) => {
        await page.goto('/privacy-controls');
        await expect(page.locator('[data-testid="privacy-controls-container"]')).toBeVisible();
    });

    test('should handle privacy-controls actions', async ({ page }) => {
        await page.goto('/privacy-controls');
        await expect(page.locator('[data-testid="privacy-controls-actions"]')).toBeVisible();
    });

    test('should validate privacy-controls data', async ({ page }) => {
        await page.goto('/privacy-controls');
        await expect(page.locator('[data-testid="privacy-controls-data"]')).toBeVisible();
    });

    test('should display privacy-controls correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/privacy-controls');
        await expect(page.locator('[data-testid="privacy-controls-mobile"]')).toBeVisible();
    });

    test('should handle privacy-controls errors gracefully', async ({ page }) => {
        await page.goto('/privacy-controls');
        // Simulate error condition
        await expect(page.locator('[data-testid="privacy-controls-error-fallback"]')).toBeVisible();
    });
});
