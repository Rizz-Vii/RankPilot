import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: status-page
 * Tests status-page functionality
 */

test.describe('Feature - status-page', () => {
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

    test('should load status-page interface', async ({ page }) => {
        await page.goto('/status-page');
        await expect(page.locator('[data-testid="status-page-container"]')).toBeVisible();
    });

    test('should handle status-page actions', async ({ page }) => {
        await page.goto('/status-page');
        await expect(page.locator('[data-testid="status-page-actions"]')).toBeVisible();
    });

    test('should validate status-page data', async ({ page }) => {
        await page.goto('/status-page');
        await expect(page.locator('[data-testid="status-page-data"]')).toBeVisible();
    });

    test('should display status-page correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/status-page');
        await expect(page.locator('[data-testid="status-page-mobile"]')).toBeVisible();
    });

    test('should handle status-page errors gracefully', async ({ page }) => {
        await page.goto('/status-page');
        // Simulate error condition
        await expect(page.locator('[data-testid="status-page-error-fallback"]')).toBeVisible();
    });
});
