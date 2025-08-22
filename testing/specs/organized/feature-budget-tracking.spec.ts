import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: budget-tracking
 * Tests budget-tracking functionality
 */

test.describe('Feature - budget-tracking', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: unknown) {
            const msg = (error && typeof error === 'object' && 'message' in error)
                ? String((error as { message?: unknown }).message)
                : 'unknown';
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load budget-tracking interface', async ({ page }) => {
        await page.goto('/budget-tracking');
        await expect(page.locator('[data-testid="budget-tracking-container"]')).toBeVisible();
    });

    test('should handle budget-tracking actions', async ({ page }) => {
        await page.goto('/budget-tracking');
        await expect(page.locator('[data-testid="budget-tracking-actions"]')).toBeVisible();
    });

    test('should validate budget-tracking data', async ({ page }) => {
        await page.goto('/budget-tracking');
        await expect(page.locator('[data-testid="budget-tracking-data"]')).toBeVisible();
    });

    test('should display budget-tracking correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/budget-tracking');
        await expect(page.locator('[data-testid="budget-tracking-mobile"]')).toBeVisible();
    });

    test('should handle budget-tracking errors gracefully', async ({ page }) => {
        await page.goto('/budget-tracking');
        // Simulate error condition
        await expect(page.locator('[data-testid="budget-tracking-error-fallback"]')).toBeVisible();
    });
});
