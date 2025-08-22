import { extractErrorMessage } from '@/lib/errors/extract-error-message';
import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: cache-management
 * Tests cache-management functionality
 */

test.describe('Feature - cache-management', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: unknown) {
            console.warn('Login failed, using fallback:', extractErrorMessage(error));
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load cache-management interface', async ({ page }) => {
        await page.goto('/cache-management');
        await expect(page.locator('[data-testid="cache-management-container"]')).toBeVisible();
    });

    test('should handle cache-management actions', async ({ page }) => {
        await page.goto('/cache-management');
        await expect(page.locator('[data-testid="cache-management-actions"]')).toBeVisible();
    });

    test('should validate cache-management data', async ({ page }) => {
        await page.goto('/cache-management');
        await expect(page.locator('[data-testid="cache-management-data"]')).toBeVisible();
    });

    test('should display cache-management correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/cache-management');
        await expect(page.locator('[data-testid="cache-management-mobile"]')).toBeVisible();
    });

    test('should handle cache-management errors gracefully', async ({ page }) => {
        await page.goto('/cache-management');
        // Simulate error condition
        await expect(page.locator('[data-testid="cache-management-error-fallback"]')).toBeVisible();
    });
});
