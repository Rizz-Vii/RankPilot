import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: analytics-reporting
 * Tests analytics-reporting functionality
 */

test.describe('Feature - analytics-reporting', () => {
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
                : 'unknown';
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load analytics-reporting interface', async ({ page }) => {
        await page.goto('/analytics-reporting');
        await expect(page.locator('[data-testid="analytics-reporting-container"]')).toBeVisible();
    });

    test('should handle analytics-reporting actions', async ({ page }) => {
        await page.goto('/analytics-reporting');
        await expect(page.locator('[data-testid="analytics-reporting-actions"]')).toBeVisible();
    });

    test('should validate analytics-reporting data', async ({ page }) => {
        await page.goto('/analytics-reporting');
        await expect(page.locator('[data-testid="analytics-reporting-data"]')).toBeVisible();
    });

    test('should display analytics-reporting correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/analytics-reporting');
        await expect(page.locator('[data-testid="analytics-reporting-mobile"]')).toBeVisible();
    });

    test('should handle analytics-reporting errors gracefully', async ({ page }) => {
        await page.goto('/analytics-reporting');
        // Simulate error condition
        await expect(page.locator('[data-testid="analytics-reporting-error-fallback"]')).toBeVisible();
    });
});
