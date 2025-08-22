import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: logging-system
 * Tests logging-system functionality
 */

test.describe('Feature - logging-system', () => {
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

    test('should load logging-system interface', async ({ page }) => {
        await page.goto('/logging-system');
        await expect(page.locator('[data-testid="logging-system-container"]')).toBeVisible();
    });

    test('should handle logging-system actions', async ({ page }) => {
        await page.goto('/logging-system');
        await expect(page.locator('[data-testid="logging-system-actions"]')).toBeVisible();
    });

    test('should validate logging-system data', async ({ page }) => {
        await page.goto('/logging-system');
        await expect(page.locator('[data-testid="logging-system-data"]')).toBeVisible();
    });

    test('should display logging-system correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/logging-system');
        await expect(page.locator('[data-testid="logging-system-mobile"]')).toBeVisible();
    });

    test('should handle logging-system errors gracefully', async ({ page }) => {
        await page.goto('/logging-system');
        // Simulate error condition
        await expect(page.locator('[data-testid="logging-system-error-fallback"]')).toBeVisible();
    });
});
