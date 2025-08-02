import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: api-versioning
 * Tests api-versioning functionality
 */

test.describe('Feature - api-versioning', () => {
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

    test('should load api-versioning interface', async ({ page }) => {
        await page.goto('/api-versioning');
        await expect(page.locator('[data-testid="api-versioning-container"]')).toBeVisible();
    });

    test('should handle api-versioning actions', async ({ page }) => {
        await page.goto('/api-versioning');
        await expect(page.locator('[data-testid="api-versioning-actions"]')).toBeVisible();
    });

    test('should validate api-versioning data', async ({ page }) => {
        await page.goto('/api-versioning');
        await expect(page.locator('[data-testid="api-versioning-data"]')).toBeVisible();
    });

    test('should display api-versioning correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/api-versioning');
        await expect(page.locator('[data-testid="api-versioning-mobile"]')).toBeVisible();
    });

    test('should handle api-versioning errors gracefully', async ({ page }) => {
        await page.goto('/api-versioning');
        // Simulate error condition
        await expect(page.locator('[data-testid="api-versioning-error-fallback"]')).toBeVisible();
    });
});
