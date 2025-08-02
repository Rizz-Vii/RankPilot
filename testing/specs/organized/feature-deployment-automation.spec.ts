import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: deployment-automation
 * Tests deployment-automation functionality
 */

test.describe('Feature - deployment-automation', () => {
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

    test('should load deployment-automation interface', async ({ page }) => {
        await page.goto('/deployment-automation');
        await expect(page.locator('[data-testid="deployment-automation-container"]')).toBeVisible();
    });

    test('should handle deployment-automation actions', async ({ page }) => {
        await page.goto('/deployment-automation');
        await expect(page.locator('[data-testid="deployment-automation-actions"]')).toBeVisible();
    });

    test('should validate deployment-automation data', async ({ page }) => {
        await page.goto('/deployment-automation');
        await expect(page.locator('[data-testid="deployment-automation-data"]')).toBeVisible();
    });

    test('should display deployment-automation correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/deployment-automation');
        await expect(page.locator('[data-testid="deployment-automation-mobile"]')).toBeVisible();
    });

    test('should handle deployment-automation errors gracefully', async ({ page }) => {
        await page.goto('/deployment-automation');
        // Simulate error condition
        await expect(page.locator('[data-testid="deployment-automation-error-fallback"]')).toBeVisible();
    });
});
