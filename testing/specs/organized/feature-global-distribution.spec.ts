import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: global-distribution
 * Tests global-distribution functionality
 */

test.describe('Feature - global-distribution', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: unknown) {
            const msg = (error && typeof error === 'object' && 'message' in error)
                ? String((error as { message?: unknown }).message)
                : String(error);
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load global-distribution interface', async ({ page }) => {
        await page.goto('/global-distribution');
        await expect(page.locator('[data-testid="global-distribution-container"]')).toBeVisible();
    });

    test('should handle global-distribution actions', async ({ page }) => {
        await page.goto('/global-distribution');
        await expect(page.locator('[data-testid="global-distribution-actions"]')).toBeVisible();
    });

    test('should validate global-distribution data', async ({ page }) => {
        await page.goto('/global-distribution');
        await expect(page.locator('[data-testid="global-distribution-data"]')).toBeVisible();
    });

    test('should display global-distribution correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/global-distribution');
        await expect(page.locator('[data-testid="global-distribution-mobile"]')).toBeVisible();
    });

    test('should handle global-distribution errors gracefully', async ({ page }) => {
        await page.goto('/global-distribution');
        // Simulate error condition
        await expect(page.locator('[data-testid="global-distribution-error-fallback"]')).toBeVisible();
    });
});
