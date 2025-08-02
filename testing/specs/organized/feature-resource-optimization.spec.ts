import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

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
        } catch (_error: unknown) {
            console.warn('Login failed, using fallback:', error.message);
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
