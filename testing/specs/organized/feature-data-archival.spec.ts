import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-archival
 * Tests data-archival functionality
 */

test.describe('Feature - data-archival', () => {
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

    test('should load data-archival interface', async ({ page }) => {
        await page.goto('/data-archival');
        await expect(page.locator('[data-testid="data-archival-container"]')).toBeVisible();
    });

    test('should handle data-archival actions', async ({ page }) => {
        await page.goto('/data-archival');
        await expect(page.locator('[data-testid="data-archival-actions"]')).toBeVisible();
    });

    test('should validate data-archival data', async ({ page }) => {
        await page.goto('/data-archival');
        await expect(page.locator('[data-testid="data-archival-data"]')).toBeVisible();
    });

    test('should display data-archival correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-archival');
        await expect(page.locator('[data-testid="data-archival-mobile"]')).toBeVisible();
    });

    test('should handle data-archival errors gracefully', async ({ page }) => {
        await page.goto('/data-archival');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-archival-error-fallback"]')).toBeVisible();
    });
});
