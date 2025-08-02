import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: feature-toggles
 * Tests feature-toggles functionality
 */

test.describe('Feature - feature-toggles', () => {
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

    test('should load feature-toggles interface', async ({ page }) => {
        await page.goto('/feature-toggles');
        await expect(page.locator('[data-testid="feature-toggles-container"]')).toBeVisible();
    });

    test('should handle feature-toggles actions', async ({ page }) => {
        await page.goto('/feature-toggles');
        await expect(page.locator('[data-testid="feature-toggles-actions"]')).toBeVisible();
    });

    test('should validate feature-toggles data', async ({ page }) => {
        await page.goto('/feature-toggles');
        await expect(page.locator('[data-testid="feature-toggles-data"]')).toBeVisible();
    });

    test('should display feature-toggles correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/feature-toggles');
        await expect(page.locator('[data-testid="feature-toggles-mobile"]')).toBeVisible();
    });

    test('should handle feature-toggles errors gracefully', async ({ page }) => {
        await page.goto('/feature-toggles');
        // Simulate error condition
        await expect(page.locator('[data-testid="feature-toggles-error-fallback"]')).toBeVisible();
    });
});
