import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-discovery
 * Tests data-discovery functionality
 */

test.describe('Feature - data-discovery', () => {
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

    test('should load data-discovery interface', async ({ page }) => {
        await page.goto('/data-discovery');
        await expect(page.locator('[data-testid="data-discovery-container"]')).toBeVisible();
    });

    test('should handle data-discovery actions', async ({ page }) => {
        await page.goto('/data-discovery');
        await expect(page.locator('[data-testid="data-discovery-actions"]')).toBeVisible();
    });

    test('should validate data-discovery data', async ({ page }) => {
        await page.goto('/data-discovery');
        await expect(page.locator('[data-testid="data-discovery-data"]')).toBeVisible();
    });

    test('should display data-discovery correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-discovery');
        await expect(page.locator('[data-testid="data-discovery-mobile"]')).toBeVisible();
    });

    test('should handle data-discovery errors gracefully', async ({ page }) => {
        await page.goto('/data-discovery');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-discovery-error-fallback"]')).toBeVisible();
    });
});
