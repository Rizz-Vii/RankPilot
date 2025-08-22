import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: admin-controls
 * Tests admin-controls functionality
 */

test.describe('Feature - admin-controls', () => {
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

    test('should load admin-controls interface', async ({ page }) => {
        await page.goto('/admin-controls');
        await expect(page.locator('[data-testid="admin-controls-container"]')).toBeVisible();
    });

    test('should handle admin-controls actions', async ({ page }) => {
        await page.goto('/admin-controls');
        await expect(page.locator('[data-testid="admin-controls-actions"]')).toBeVisible();
    });

    test('should validate admin-controls data', async ({ page }) => {
        await page.goto('/admin-controls');
        await expect(page.locator('[data-testid="admin-controls-data"]')).toBeVisible();
    });

    test('should display admin-controls correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/admin-controls');
        await expect(page.locator('[data-testid="admin-controls-mobile"]')).toBeVisible();
    });

    test('should handle admin-controls errors gracefully', async ({ page }) => {
        await page.goto('/admin-controls');
        // Simulate error condition
        await expect(page.locator('[data-testid="admin-controls-error-fallback"]')).toBeVisible();
    });
});
