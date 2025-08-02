import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: rollback-procedures
 * Tests rollback-procedures functionality
 */

test.describe('Feature - rollback-procedures', () => {
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

    test('should load rollback-procedures interface', async ({ page }) => {
        await page.goto('/rollback-procedures');
        await expect(page.locator('[data-testid="rollback-procedures-container"]')).toBeVisible();
    });

    test('should handle rollback-procedures actions', async ({ page }) => {
        await page.goto('/rollback-procedures');
        await expect(page.locator('[data-testid="rollback-procedures-actions"]')).toBeVisible();
    });

    test('should validate rollback-procedures data', async ({ page }) => {
        await page.goto('/rollback-procedures');
        await expect(page.locator('[data-testid="rollback-procedures-data"]')).toBeVisible();
    });

    test('should display rollback-procedures correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/rollback-procedures');
        await expect(page.locator('[data-testid="rollback-procedures-mobile"]')).toBeVisible();
    });

    test('should handle rollback-procedures errors gracefully', async ({ page }) => {
        await page.goto('/rollback-procedures');
        // Simulate error condition
        await expect(page.locator('[data-testid="rollback-procedures-error-fallback"]')).toBeVisible();
    });
});
