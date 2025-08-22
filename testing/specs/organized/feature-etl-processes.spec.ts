import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: etl-processes
 * Tests etl-processes functionality
 */

test.describe('Feature - etl-processes', () => {
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
                : String(error);
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load etl-processes interface', async ({ page }) => {
        await page.goto('/etl-processes');
        await expect(page.locator('[data-testid="etl-processes-container"]')).toBeVisible();
    });

    test('should handle etl-processes actions', async ({ page }) => {
        await page.goto('/etl-processes');
        await expect(page.locator('[data-testid="etl-processes-actions"]')).toBeVisible();
    });

    test('should validate etl-processes data', async ({ page }) => {
        await page.goto('/etl-processes');
        await expect(page.locator('[data-testid="etl-processes-data"]')).toBeVisible();
    });

    test('should display etl-processes correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/etl-processes');
        await expect(page.locator('[data-testid="etl-processes-mobile"]')).toBeVisible();
    });

    test('should handle etl-processes errors gracefully', async ({ page }) => {
        await page.goto('/etl-processes');
        // Simulate error condition
        await expect(page.locator('[data-testid="etl-processes-error-fallback"]')).toBeVisible();
    });
});
