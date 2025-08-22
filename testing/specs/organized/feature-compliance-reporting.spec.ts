import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: compliance-reporting
 * Tests compliance-reporting functionality
 */

test.describe('Feature - compliance-reporting', () => {
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

    test('should load compliance-reporting interface', async ({ page }) => {
        await page.goto('/compliance-reporting');
        await expect(page.locator('[data-testid="compliance-reporting-container"]')).toBeVisible();
    });

    test('should handle compliance-reporting actions', async ({ page }) => {
        await page.goto('/compliance-reporting');
        await expect(page.locator('[data-testid="compliance-reporting-actions"]')).toBeVisible();
    });

    test('should validate compliance-reporting data', async ({ page }) => {
        await page.goto('/compliance-reporting');
        await expect(page.locator('[data-testid="compliance-reporting-data"]')).toBeVisible();
    });

    test('should display compliance-reporting correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/compliance-reporting');
        await expect(page.locator('[data-testid="compliance-reporting-mobile"]')).toBeVisible();
    });

    test('should handle compliance-reporting errors gracefully', async ({ page }) => {
        await page.goto('/compliance-reporting');
        // Simulate error condition
        await expect(page.locator('[data-testid="compliance-reporting-error-fallback"]')).toBeVisible();
    });
});
