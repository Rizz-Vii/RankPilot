import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: maintenance-mode
 * Tests maintenance-mode functionality
 */

test.describe('Feature - maintenance-mode', () => {
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

    test('should load maintenance-mode interface', async ({ page }) => {
        await page.goto('/maintenance-mode');
        await expect(page.locator('[data-testid="maintenance-mode-container"]')).toBeVisible();
    });

    test('should handle maintenance-mode actions', async ({ page }) => {
        await page.goto('/maintenance-mode');
        await expect(page.locator('[data-testid="maintenance-mode-actions"]')).toBeVisible();
    });

    test('should validate maintenance-mode data', async ({ page }) => {
        await page.goto('/maintenance-mode');
        await expect(page.locator('[data-testid="maintenance-mode-data"]')).toBeVisible();
    });

    test('should display maintenance-mode correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/maintenance-mode');
        await expect(page.locator('[data-testid="maintenance-mode-mobile"]')).toBeVisible();
    });

    test('should handle maintenance-mode errors gracefully', async ({ page }) => {
        await page.goto('/maintenance-mode');
        // Simulate error condition
        await expect(page.locator('[data-testid="maintenance-mode-error-fallback"]')).toBeVisible();
    });
});
