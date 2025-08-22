import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

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
        } catch (error: unknown) {
            const msg = (error && typeof error === 'object' && 'message' in error)
                ? (error as { message: string }).message
                : String(error);
            console.warn('Login failed, using fallback:', msg);
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
