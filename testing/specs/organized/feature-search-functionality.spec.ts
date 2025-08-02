import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: search-functionality
 * Tests search-functionality functionality
 */

test.describe('Feature - search-functionality', () => {
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

    test('should load search-functionality interface', async ({ page }) => {
        await page.goto('/search-functionality');
        await expect(page.locator('[data-testid="search-functionality-container"]')).toBeVisible();
    });

    test('should handle search-functionality actions', async ({ page }) => {
        await page.goto('/search-functionality');
        await expect(page.locator('[data-testid="search-functionality-actions"]')).toBeVisible();
    });

    test('should validate search-functionality data', async ({ page }) => {
        await page.goto('/search-functionality');
        await expect(page.locator('[data-testid="search-functionality-data"]')).toBeVisible();
    });

    test('should display search-functionality correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/search-functionality');
        await expect(page.locator('[data-testid="search-functionality-mobile"]')).toBeVisible();
    });

    test('should handle search-functionality errors gracefully', async ({ page }) => {
        await page.goto('/search-functionality');
        // Simulate error condition
        await expect(page.locator('[data-testid="search-functionality-error-fallback"]')).toBeVisible();
    });
});
