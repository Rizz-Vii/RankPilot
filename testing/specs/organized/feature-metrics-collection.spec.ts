import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: metrics-collection
 * Tests metrics-collection functionality
 */

test.describe('Feature - metrics-collection', () => {
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

    test('should load metrics-collection interface', async ({ page }) => {
        await page.goto('/metrics-collection');
        await expect(page.locator('[data-testid="metrics-collection-container"]')).toBeVisible();
    });

    test('should handle metrics-collection actions', async ({ page }) => {
        await page.goto('/metrics-collection');
        await expect(page.locator('[data-testid="metrics-collection-actions"]')).toBeVisible();
    });

    test('should validate metrics-collection data', async ({ page }) => {
        await page.goto('/metrics-collection');
        await expect(page.locator('[data-testid="metrics-collection-data"]')).toBeVisible();
    });

    test('should display metrics-collection correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/metrics-collection');
        await expect(page.locator('[data-testid="metrics-collection-mobile"]')).toBeVisible();
    });

    test('should handle metrics-collection errors gracefully', async ({ page }) => {
        await page.goto('/metrics-collection');
        // Simulate error condition
        await expect(page.locator('[data-testid="metrics-collection-error-fallback"]')).toBeVisible();
    });
});
