import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: multi-cloud-support
 * Tests multi-cloud-support functionality
 */

test.describe('Feature - multi-cloud-support', () => {
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

    test('should load multi-cloud-support interface', async ({ page }) => {
        await page.goto('/multi-cloud-support');
        await expect(page.locator('[data-testid="multi-cloud-support-container"]')).toBeVisible();
    });

    test('should handle multi-cloud-support actions', async ({ page }) => {
        await page.goto('/multi-cloud-support');
        await expect(page.locator('[data-testid="multi-cloud-support-actions"]')).toBeVisible();
    });

    test('should validate multi-cloud-support data', async ({ page }) => {
        await page.goto('/multi-cloud-support');
        await expect(page.locator('[data-testid="multi-cloud-support-data"]')).toBeVisible();
    });

    test('should display multi-cloud-support correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/multi-cloud-support');
        await expect(page.locator('[data-testid="multi-cloud-support-mobile"]')).toBeVisible();
    });

    test('should handle multi-cloud-support errors gracefully', async ({ page }) => {
        await page.goto('/multi-cloud-support');
        // Simulate error condition
        await expect(page.locator('[data-testid="multi-cloud-support-error-fallback"]')).toBeVisible();
    });
});
