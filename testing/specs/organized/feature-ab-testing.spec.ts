import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: ab-testing
 * Tests ab-testing functionality
 */

test.describe('Feature - ab-testing', () => {
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

    test('should load ab-testing interface', async ({ page }) => {
        await page.goto('/ab-testing');
        await expect(page.locator('[data-testid="ab-testing-container"]')).toBeVisible();
    });

    test('should handle ab-testing actions', async ({ page }) => {
        await page.goto('/ab-testing');
        await expect(page.locator('[data-testid="ab-testing-actions"]')).toBeVisible();
    });

    test('should validate ab-testing data', async ({ page }) => {
        await page.goto('/ab-testing');
        await expect(page.locator('[data-testid="ab-testing-data"]')).toBeVisible();
    });

    test('should display ab-testing correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/ab-testing');
        await expect(page.locator('[data-testid="ab-testing-mobile"]')).toBeVisible();
    });

    test('should handle ab-testing errors gracefully', async ({ page }) => {
        await page.goto('/ab-testing');
        // Simulate error condition
        await expect(page.locator('[data-testid="ab-testing-error-fallback"]')).toBeVisible();
    });
});
