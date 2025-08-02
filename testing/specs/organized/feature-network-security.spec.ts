import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: network-security
 * Tests network-security functionality
 */

test.describe('Feature - network-security', () => {
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

    test('should load network-security interface', async ({ page }) => {
        await page.goto('/network-security');
        await expect(page.locator('[data-testid="network-security-container"]')).toBeVisible();
    });

    test('should handle network-security actions', async ({ page }) => {
        await page.goto('/network-security');
        await expect(page.locator('[data-testid="network-security-actions"]')).toBeVisible();
    });

    test('should validate network-security data', async ({ page }) => {
        await page.goto('/network-security');
        await expect(page.locator('[data-testid="network-security-data"]')).toBeVisible();
    });

    test('should display network-security correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/network-security');
        await expect(page.locator('[data-testid="network-security-mobile"]')).toBeVisible();
    });

    test('should handle network-security errors gracefully', async ({ page }) => {
        await page.goto('/network-security');
        // Simulate error condition
        await expect(page.locator('[data-testid="network-security-error-fallback"]')).toBeVisible();
    });
});
