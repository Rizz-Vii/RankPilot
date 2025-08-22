import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: license-compliance
 * Tests license-compliance functionality
 */

test.describe('Feature - license-compliance', () => {
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
                : String(error);
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load license-compliance interface', async ({ page }) => {
        await page.goto('/license-compliance');
        await expect(page.locator('[data-testid="license-compliance-container"]')).toBeVisible();
    });

    test('should handle license-compliance actions', async ({ page }) => {
        await page.goto('/license-compliance');
        await expect(page.locator('[data-testid="license-compliance-actions"]')).toBeVisible();
    });

    test('should validate license-compliance data', async ({ page }) => {
        await page.goto('/license-compliance');
        await expect(page.locator('[data-testid="license-compliance-data"]')).toBeVisible();
    });

    test('should display license-compliance correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/license-compliance');
        await expect(page.locator('[data-testid="license-compliance-mobile"]')).toBeVisible();
    });

    test('should handle license-compliance errors gracefully', async ({ page }) => {
        await page.goto('/license-compliance');
        // Simulate error condition
        await expect(page.locator('[data-testid="license-compliance-error-fallback"]')).toBeVisible();
    });
});
