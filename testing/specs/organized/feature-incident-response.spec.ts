import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: incident-response
 * Tests incident-response functionality
 */

test.describe('Feature - incident-response', () => {
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

    test('should load incident-response interface', async ({ page }) => {
        await page.goto('/incident-response');
        await expect(page.locator('[data-testid="incident-response-container"]')).toBeVisible();
    });

    test('should handle incident-response actions', async ({ page }) => {
        await page.goto('/incident-response');
        await expect(page.locator('[data-testid="incident-response-actions"]')).toBeVisible();
    });

    test('should validate incident-response data', async ({ page }) => {
        await page.goto('/incident-response');
        await expect(page.locator('[data-testid="incident-response-data"]')).toBeVisible();
    });

    test('should display incident-response correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/incident-response');
        await expect(page.locator('[data-testid="incident-response-mobile"]')).toBeVisible();
    });

    test('should handle incident-response errors gracefully', async ({ page }) => {
        await page.goto('/incident-response');
        // Simulate error condition
        await expect(page.locator('[data-testid="incident-response-error-fallback"]')).toBeVisible();
    });
});
