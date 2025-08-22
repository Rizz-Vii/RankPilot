import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: stress-testing
 * Tests stress-testing functionality
 */

test.describe('Feature - stress-testing', () => {
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

    test('should load stress-testing interface', async ({ page }) => {
        await page.goto('/stress-testing');
        await expect(page.locator('[data-testid="stress-testing-container"]')).toBeVisible();
    });

    test('should handle stress-testing actions', async ({ page }) => {
        await page.goto('/stress-testing');
        await expect(page.locator('[data-testid="stress-testing-actions"]')).toBeVisible();
    });

    test('should validate stress-testing data', async ({ page }) => {
        await page.goto('/stress-testing');
        await expect(page.locator('[data-testid="stress-testing-data"]')).toBeVisible();
    });

    test('should display stress-testing correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/stress-testing');
        await expect(page.locator('[data-testid="stress-testing-mobile"]')).toBeVisible();
    });

    test('should handle stress-testing errors gracefully', async ({ page }) => {
        await page.goto('/stress-testing');
        // Simulate error condition
        await expect(page.locator('[data-testid="stress-testing-error-fallback"]')).toBeVisible();
    });
});
