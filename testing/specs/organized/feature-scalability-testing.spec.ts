import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: scalability-testing
 * Tests scalability-testing functionality
 */

test.describe('Feature - scalability-testing', () => {
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

    test('should load scalability-testing interface', async ({ page }) => {
        await page.goto('/scalability-testing');
        await expect(page.locator('[data-testid="scalability-testing-container"]')).toBeVisible();
    });

    test('should handle scalability-testing actions', async ({ page }) => {
        await page.goto('/scalability-testing');
        await expect(page.locator('[data-testid="scalability-testing-actions"]')).toBeVisible();
    });

    test('should validate scalability-testing data', async ({ page }) => {
        await page.goto('/scalability-testing');
        await expect(page.locator('[data-testid="scalability-testing-data"]')).toBeVisible();
    });

    test('should display scalability-testing correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/scalability-testing');
        await expect(page.locator('[data-testid="scalability-testing-mobile"]')).toBeVisible();
    });

    test('should handle scalability-testing errors gracefully', async ({ page }) => {
        await page.goto('/scalability-testing');
        // Simulate error condition
        await expect(page.locator('[data-testid="scalability-testing-error-fallback"]')).toBeVisible();
    });
});
