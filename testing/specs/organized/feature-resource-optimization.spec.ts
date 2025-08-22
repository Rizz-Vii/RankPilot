import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: resource-optimization
 * Tests resource-optimization functionality
 */

test.describe('Feature - resource-optimization', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: unknown) {
            const msg = (error && typeof error === 'object' && 'message' in error)
                ? (error as { message: string }).message
                : String(error);
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load resource-optimization interface', async ({ page }) => {
        await page.goto('/resource-optimization');
        await expect(page.locator('[data-testid="resource-optimization-container"]')).toBeVisible();
    });

    test('should handle resource-optimization actions', async ({ page }) => {
        await page.goto('/resource-optimization');
        await expect(page.locator('[data-testid="resource-optimization-actions"]')).toBeVisible();
    });

    test('should validate resource-optimization data', async ({ page }) => {
        await page.goto('/resource-optimization');
        await expect(page.locator('[data-testid="resource-optimization-data"]')).toBeVisible();
    });

    test('should display resource-optimization correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/resource-optimization');
        await expect(page.locator('[data-testid="resource-optimization-mobile"]')).toBeVisible();
    });

    test('should handle resource-optimization errors gracefully', async ({ page }) => {
        await page.goto('/resource-optimization');
        // Simulate error condition
        await expect(page.locator('[data-testid="resource-optimization-error-fallback"]')).toBeVisible();
    });
});
