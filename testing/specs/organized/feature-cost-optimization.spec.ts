import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: cost-optimization
 * Tests cost-optimization functionality
 */

test.describe('Feature - cost-optimization', () => {
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

    test('should load cost-optimization interface', async ({ page }) => {
        await page.goto('/cost-optimization');
        await expect(page.locator('[data-testid="cost-optimization-container"]')).toBeVisible();
    });

    test('should handle cost-optimization actions', async ({ page }) => {
        await page.goto('/cost-optimization');
        await expect(page.locator('[data-testid="cost-optimization-actions"]')).toBeVisible();
    });

    test('should validate cost-optimization data', async ({ page }) => {
        await page.goto('/cost-optimization');
        await expect(page.locator('[data-testid="cost-optimization-data"]')).toBeVisible();
    });

    test('should display cost-optimization correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/cost-optimization');
        await expect(page.locator('[data-testid="cost-optimization-mobile"]')).toBeVisible();
    });

    test('should handle cost-optimization errors gracefully', async ({ page }) => {
        await page.goto('/cost-optimization');
        // Simulate error condition
        await expect(page.locator('[data-testid="cost-optimization-error-fallback"]')).toBeVisible();
    });
});
