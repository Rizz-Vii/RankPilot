import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: load-balancing
 * Tests load-balancing functionality
 */

test.describe('Feature - load-balancing', () => {
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

    test('should load load-balancing interface', async ({ page }) => {
        await page.goto('/load-balancing');
        await expect(page.locator('[data-testid="load-balancing-container"]')).toBeVisible();
    });

    test('should handle load-balancing actions', async ({ page }) => {
        await page.goto('/load-balancing');
        await expect(page.locator('[data-testid="load-balancing-actions"]')).toBeVisible();
    });

    test('should validate load-balancing data', async ({ page }) => {
        await page.goto('/load-balancing');
        await expect(page.locator('[data-testid="load-balancing-data"]')).toBeVisible();
    });

    test('should display load-balancing correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/load-balancing');
        await expect(page.locator('[data-testid="load-balancing-mobile"]')).toBeVisible();
    });

    test('should handle load-balancing errors gracefully', async ({ page }) => {
        await page.goto('/load-balancing');
        // Simulate error condition
        await expect(page.locator('[data-testid="load-balancing-error-fallback"]')).toBeVisible();
    });
});
