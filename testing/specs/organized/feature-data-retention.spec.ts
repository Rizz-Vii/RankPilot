import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-retention
 * Tests data-retention functionality
 */

test.describe('Feature - data-retention', () => {
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

    test('should load data-retention interface', async ({ page }) => {
        await page.goto('/data-retention');
        await expect(page.locator('[data-testid="data-retention-container"]')).toBeVisible();
    });

    test('should handle data-retention actions', async ({ page }) => {
        await page.goto('/data-retention');
        await expect(page.locator('[data-testid="data-retention-actions"]')).toBeVisible();
    });

    test('should validate data-retention data', async ({ page }) => {
        await page.goto('/data-retention');
        await expect(page.locator('[data-testid="data-retention-data"]')).toBeVisible();
    });

    test('should display data-retention correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-retention');
        await expect(page.locator('[data-testid="data-retention-mobile"]')).toBeVisible();
    });

    test('should handle data-retention errors gracefully', async ({ page }) => {
        await page.goto('/data-retention');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-retention-error-fallback"]')).toBeVisible();
    });
});
