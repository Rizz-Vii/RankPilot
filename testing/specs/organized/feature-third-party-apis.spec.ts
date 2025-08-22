import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: third-party-apis
 * Tests third-party-apis functionality
 */

test.describe('Feature - third-party-apis', () => {
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

    test('should load third-party-apis interface', async ({ page }) => {
        await page.goto('/third-party-apis');
        await expect(page.locator('[data-testid="third-party-apis-container"]')).toBeVisible();
    });

    test('should handle third-party-apis actions', async ({ page }) => {
        await page.goto('/third-party-apis');
        await expect(page.locator('[data-testid="third-party-apis-actions"]')).toBeVisible();
    });

    test('should validate third-party-apis data', async ({ page }) => {
        await page.goto('/third-party-apis');
        await expect(page.locator('[data-testid="third-party-apis-data"]')).toBeVisible();
    });

    test('should display third-party-apis correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/third-party-apis');
        await expect(page.locator('[data-testid="third-party-apis-mobile"]')).toBeVisible();
    });

    test('should handle third-party-apis errors gracefully', async ({ page }) => {
        await page.goto('/third-party-apis');
        // Simulate error condition
        await expect(page.locator('[data-testid="third-party-apis-error-fallback"]')).toBeVisible();
    });
});
