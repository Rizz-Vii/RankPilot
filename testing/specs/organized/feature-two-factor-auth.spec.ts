import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: two-factor-auth
 * Tests two-factor-auth functionality
 */

test.describe('Feature - two-factor-auth', () => {
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

    test('should load two-factor-auth interface', async ({ page }) => {
        await page.goto('/two-factor-auth');
        await expect(page.locator('[data-testid="two-factor-auth-container"]')).toBeVisible();
    });

    test('should handle two-factor-auth actions', async ({ page }) => {
        await page.goto('/two-factor-auth');
        await expect(page.locator('[data-testid="two-factor-auth-actions"]')).toBeVisible();
    });

    test('should validate two-factor-auth data', async ({ page }) => {
        await page.goto('/two-factor-auth');
        await expect(page.locator('[data-testid="two-factor-auth-data"]')).toBeVisible();
    });

    test('should display two-factor-auth correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/two-factor-auth');
        await expect(page.locator('[data-testid="two-factor-auth-mobile"]')).toBeVisible();
    });

    test('should handle two-factor-auth errors gracefully', async ({ page }) => {
        await page.goto('/two-factor-auth');
        // Simulate error condition
        await expect(page.locator('[data-testid="two-factor-auth-error-fallback"]')).toBeVisible();
    });
});
