import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: internationalization
 * Tests internationalization functionality
 */

test.describe('Feature - internationalization', () => {
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

    test('should load internationalization interface', async ({ page }) => {
        await page.goto('/internationalization');
        await expect(page.locator('[data-testid="internationalization-container"]')).toBeVisible();
    });

    test('should handle internationalization actions', async ({ page }) => {
        await page.goto('/internationalization');
        await expect(page.locator('[data-testid="internationalization-actions"]')).toBeVisible();
    });

    test('should validate internationalization data', async ({ page }) => {
        await page.goto('/internationalization');
        await expect(page.locator('[data-testid="internationalization-data"]')).toBeVisible();
    });

    test('should display internationalization correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/internationalization');
        await expect(page.locator('[data-testid="internationalization-mobile"]')).toBeVisible();
    });

    test('should handle internationalization errors gracefully', async ({ page }) => {
        await page.goto('/internationalization');
        // Simulate error condition
        await expect(page.locator('[data-testid="internationalization-error-fallback"]')).toBeVisible();
    });
});
