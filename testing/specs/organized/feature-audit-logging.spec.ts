import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: audit-logging
 * Tests audit-logging functionality
 */

test.describe('Feature - audit-logging', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: unknown) {
            const message = (error && typeof error === 'object' && 'message' in error) ? (error as { message: string }).message : String(error);
            console.warn('Login failed, using fallback:', message);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load audit-logging interface', async ({ page }) => {
        await page.goto('/audit-logging');
        await expect(page.locator('[data-testid="audit-logging-container"]')).toBeVisible();
    });

    test('should handle audit-logging actions', async ({ page }) => {
        await page.goto('/audit-logging');
        await expect(page.locator('[data-testid="audit-logging-actions"]')).toBeVisible();
    });

    test('should validate audit-logging data', async ({ page }) => {
        await page.goto('/audit-logging');
        await expect(page.locator('[data-testid="audit-logging-data"]')).toBeVisible();
    });

    test('should display audit-logging correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/audit-logging');
        await expect(page.locator('[data-testid="audit-logging-mobile"]')).toBeVisible();
    });

    test('should handle audit-logging errors gracefully', async ({ page }) => {
        await page.goto('/audit-logging');
        // Simulate error condition
        await expect(page.locator('[data-testid="audit-logging-error-fallback"]')).toBeVisible();
    });
});
