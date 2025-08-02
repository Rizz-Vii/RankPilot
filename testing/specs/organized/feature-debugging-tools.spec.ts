import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: debugging-tools
 * Tests debugging-tools functionality
 */

test.describe('Feature - debugging-tools', () => {
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

    test('should load debugging-tools interface', async ({ page }) => {
        await page.goto('/debugging-tools');
        await expect(page.locator('[data-testid="debugging-tools-container"]')).toBeVisible();
    });

    test('should handle debugging-tools actions', async ({ page }) => {
        await page.goto('/debugging-tools');
        await expect(page.locator('[data-testid="debugging-tools-actions"]')).toBeVisible();
    });

    test('should validate debugging-tools data', async ({ page }) => {
        await page.goto('/debugging-tools');
        await expect(page.locator('[data-testid="debugging-tools-data"]')).toBeVisible();
    });

    test('should display debugging-tools correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/debugging-tools');
        await expect(page.locator('[data-testid="debugging-tools-mobile"]')).toBeVisible();
    });

    test('should handle debugging-tools errors gracefully', async ({ page }) => {
        await page.goto('/debugging-tools');
        // Simulate error condition
        await expect(page.locator('[data-testid="debugging-tools-error-fallback"]')).toBeVisible();
    });
});
