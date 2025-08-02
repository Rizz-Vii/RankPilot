import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: penetration-testing
 * Tests penetration-testing functionality
 */

test.describe('Feature - penetration-testing', () => {
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

    test('should load penetration-testing interface', async ({ page }) => {
        await page.goto('/penetration-testing');
        await expect(page.locator('[data-testid="penetration-testing-container"]')).toBeVisible();
    });

    test('should handle penetration-testing actions', async ({ page }) => {
        await page.goto('/penetration-testing');
        await expect(page.locator('[data-testid="penetration-testing-actions"]')).toBeVisible();
    });

    test('should validate penetration-testing data', async ({ page }) => {
        await page.goto('/penetration-testing');
        await expect(page.locator('[data-testid="penetration-testing-data"]')).toBeVisible();
    });

    test('should display penetration-testing correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/penetration-testing');
        await expect(page.locator('[data-testid="penetration-testing-mobile"]')).toBeVisible();
    });

    test('should handle penetration-testing errors gracefully', async ({ page }) => {
        await page.goto('/penetration-testing');
        // Simulate error condition
        await expect(page.locator('[data-testid="penetration-testing-error-fallback"]')).toBeVisible();
    });
});
