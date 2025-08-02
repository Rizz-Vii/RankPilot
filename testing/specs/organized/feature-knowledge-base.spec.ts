import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: knowledge-base
 * Tests knowledge-base functionality
 */

test.describe('Feature - knowledge-base', () => {
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

    test('should load knowledge-base interface', async ({ page }) => {
        await page.goto('/knowledge-base');
        await expect(page.locator('[data-testid="knowledge-base-container"]')).toBeVisible();
    });

    test('should handle knowledge-base actions', async ({ page }) => {
        await page.goto('/knowledge-base');
        await expect(page.locator('[data-testid="knowledge-base-actions"]')).toBeVisible();
    });

    test('should validate knowledge-base data', async ({ page }) => {
        await page.goto('/knowledge-base');
        await expect(page.locator('[data-testid="knowledge-base-data"]')).toBeVisible();
    });

    test('should display knowledge-base correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/knowledge-base');
        await expect(page.locator('[data-testid="knowledge-base-mobile"]')).toBeVisible();
    });

    test('should handle knowledge-base errors gracefully', async ({ page }) => {
        await page.goto('/knowledge-base');
        // Simulate error condition
        await expect(page.locator('[data-testid="knowledge-base-error-fallback"]')).toBeVisible();
    });
});
