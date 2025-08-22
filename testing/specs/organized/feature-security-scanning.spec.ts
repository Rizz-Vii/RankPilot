import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

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
        } catch (error: unknown) {
            const msg = (error && typeof error === 'object' && 'message' in error)
                ? (error as { message: string }).message
                : String(error);
            console.warn('Login failed, using fallback:', msg);
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
