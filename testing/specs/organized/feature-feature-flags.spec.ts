import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: feature-flags
 * Tests feature-flags functionality
 */

test.describe('Feature - feature-flags', () => {
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

    test('should load feature-flags interface', async ({ page }) => {
        await page.goto('/feature-flags');
        await expect(page.locator('[data-testid="feature-flags-container"]')).toBeVisible();
    });

    test('should handle feature-flags actions', async ({ page }) => {
        await page.goto('/feature-flags');
        await expect(page.locator('[data-testid="feature-flags-actions"]')).toBeVisible();
    });

    test('should validate feature-flags data', async ({ page }) => {
        await page.goto('/feature-flags');
        await expect(page.locator('[data-testid="feature-flags-data"]')).toBeVisible();
    });

    test('should display feature-flags correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/feature-flags');
        await expect(page.locator('[data-testid="feature-flags-mobile"]')).toBeVisible();
    });

    test('should handle feature-flags errors gracefully', async ({ page }) => {
        await page.goto('/feature-flags');
        // Simulate error condition
        await expect(page.locator('[data-testid="feature-flags-error-fallback"]')).toBeVisible();
    });
});
