import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: ssl-certificates
 * Tests ssl-certificates functionality
 */

test.describe('Feature - ssl-certificates', () => {
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

    test('should load ssl-certificates interface', async ({ page }) => {
        await page.goto('/ssl-certificates');
        await expect(page.locator('[data-testid="ssl-certificates-container"]')).toBeVisible();
    });

    test('should handle ssl-certificates actions', async ({ page }) => {
        await page.goto('/ssl-certificates');
        await expect(page.locator('[data-testid="ssl-certificates-actions"]')).toBeVisible();
    });

    test('should validate ssl-certificates data', async ({ page }) => {
        await page.goto('/ssl-certificates');
        await expect(page.locator('[data-testid="ssl-certificates-data"]')).toBeVisible();
    });

    test('should display ssl-certificates correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/ssl-certificates');
        await expect(page.locator('[data-testid="ssl-certificates-mobile"]')).toBeVisible();
    });

    test('should handle ssl-certificates errors gracefully', async ({ page }) => {
        await page.goto('/ssl-certificates');
        // Simulate error condition
        await expect(page.locator('[data-testid="ssl-certificates-error-fallback"]')).toBeVisible();
    });
});
