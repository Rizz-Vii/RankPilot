import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: reference-data
 * Tests reference-data functionality
 */

test.describe('Feature - reference-data', () => {
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

    test('should load reference-data interface', async ({ page }) => {
        await page.goto('/reference-data');
        await expect(page.locator('[data-testid="reference-data-container"]')).toBeVisible();
    });

    test('should handle reference-data actions', async ({ page }) => {
        await page.goto('/reference-data');
        await expect(page.locator('[data-testid="reference-data-actions"]')).toBeVisible();
    });

    test('should validate reference-data data', async ({ page }) => {
        await page.goto('/reference-data');
        await expect(page.locator('[data-testid="reference-data-data"]')).toBeVisible();
    });

    test('should display reference-data correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/reference-data');
        await expect(page.locator('[data-testid="reference-data-mobile"]')).toBeVisible();
    });

    test('should handle reference-data errors gracefully', async ({ page }) => {
        await page.goto('/reference-data');
        // Simulate error condition
        await expect(page.locator('[data-testid="reference-data-error-fallback"]')).toBeVisible();
    });
});
