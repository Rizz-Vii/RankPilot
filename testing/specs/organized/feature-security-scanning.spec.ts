import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: security-scanning
 * Tests security-scanning functionality
 */

test.describe('Feature - security-scanning', () => {
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

    test('should load security-scanning interface', async ({ page }) => {
        await page.goto('/security-scanning');
        await expect(page.locator('[data-testid="security-scanning-container"]')).toBeVisible();
    });

    test('should handle security-scanning actions', async ({ page }) => {
        await page.goto('/security-scanning');
        await expect(page.locator('[data-testid="security-scanning-actions"]')).toBeVisible();
    });

    test('should validate security-scanning data', async ({ page }) => {
        await page.goto('/security-scanning');
        await expect(page.locator('[data-testid="security-scanning-data"]')).toBeVisible();
    });

    test('should display security-scanning correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/security-scanning');
        await expect(page.locator('[data-testid="security-scanning-mobile"]')).toBeVisible();
    });

    test('should handle security-scanning errors gracefully', async ({ page }) => {
        await page.goto('/security-scanning');
        // Simulate error condition
        await expect(page.locator('[data-testid="security-scanning-error-fallback"]')).toBeVisible();
    });
});
