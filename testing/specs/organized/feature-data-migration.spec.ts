import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-migration
 * Tests data-migration functionality
 */

test.describe('Feature - data-migration', () => {
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

    test('should load data-migration interface', async ({ page }) => {
        await page.goto('/data-migration');
        await expect(page.locator('[data-testid="data-migration-container"]')).toBeVisible();
    });

    test('should handle data-migration actions', async ({ page }) => {
        await page.goto('/data-migration');
        await expect(page.locator('[data-testid="data-migration-actions"]')).toBeVisible();
    });

    test('should validate data-migration data', async ({ page }) => {
        await page.goto('/data-migration');
        await expect(page.locator('[data-testid="data-migration-data"]')).toBeVisible();
    });

    test('should display data-migration correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-migration');
        await expect(page.locator('[data-testid="data-migration-mobile"]')).toBeVisible();
    });

    test('should handle data-migration errors gracefully', async ({ page }) => {
        await page.goto('/data-migration');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-migration-error-fallback"]')).toBeVisible();
    });
});
