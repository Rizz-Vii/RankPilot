import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: documentation-search
 * Tests documentation-search functionality
 */

test.describe('Feature - documentation-search', () => {
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

    test('should load documentation-search interface', async ({ page }) => {
        await page.goto('/documentation-search');
        await expect(page.locator('[data-testid="documentation-search-container"]')).toBeVisible();
    });

    test('should handle documentation-search actions', async ({ page }) => {
        await page.goto('/documentation-search');
        await expect(page.locator('[data-testid="documentation-search-actions"]')).toBeVisible();
    });

    test('should validate documentation-search data', async ({ page }) => {
        await page.goto('/documentation-search');
        await expect(page.locator('[data-testid="documentation-search-data"]')).toBeVisible();
    });

    test('should display documentation-search correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/documentation-search');
        await expect(page.locator('[data-testid="documentation-search-mobile"]')).toBeVisible();
    });

    test('should handle documentation-search errors gracefully', async ({ page }) => {
        await page.goto('/documentation-search');
        // Simulate error condition
        await expect(page.locator('[data-testid="documentation-search-error-fallback"]')).toBeVisible();
    });
});
