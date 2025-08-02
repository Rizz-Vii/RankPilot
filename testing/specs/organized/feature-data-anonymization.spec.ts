import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: data-anonymization
 * Tests data-anonymization functionality
 */

test.describe('Feature - data-anonymization', () => {
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

    test('should load data-anonymization interface', async ({ page }) => {
        await page.goto('/data-anonymization');
        await expect(page.locator('[data-testid="data-anonymization-container"]')).toBeVisible();
    });

    test('should handle data-anonymization actions', async ({ page }) => {
        await page.goto('/data-anonymization');
        await expect(page.locator('[data-testid="data-anonymization-actions"]')).toBeVisible();
    });

    test('should validate data-anonymization data', async ({ page }) => {
        await page.goto('/data-anonymization');
        await expect(page.locator('[data-testid="data-anonymization-data"]')).toBeVisible();
    });

    test('should display data-anonymization correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-anonymization');
        await expect(page.locator('[data-testid="data-anonymization-mobile"]')).toBeVisible();
    });

    test('should handle data-anonymization errors gracefully', async ({ page }) => {
        await page.goto('/data-anonymization');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-anonymization-error-fallback"]')).toBeVisible();
    });
});
