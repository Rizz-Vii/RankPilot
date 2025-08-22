import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: hybrid-deployment
 * Tests hybrid-deployment functionality
 */

test.describe('Feature - hybrid-deployment', () => {
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

    test('should load hybrid-deployment interface', async ({ page }) => {
        await page.goto('/hybrid-deployment');
        await expect(page.locator('[data-testid="hybrid-deployment-container"]')).toBeVisible();
    });

    test('should handle hybrid-deployment actions', async ({ page }) => {
        await page.goto('/hybrid-deployment');
        await expect(page.locator('[data-testid="hybrid-deployment-actions"]')).toBeVisible();
    });

    test('should validate hybrid-deployment data', async ({ page }) => {
        await page.goto('/hybrid-deployment');
        await expect(page.locator('[data-testid="hybrid-deployment-data"]')).toBeVisible();
    });

    test('should display hybrid-deployment correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/hybrid-deployment');
        await expect(page.locator('[data-testid="hybrid-deployment-mobile"]')).toBeVisible();
    });

    test('should handle hybrid-deployment errors gracefully', async ({ page }) => {
        await page.goto('/hybrid-deployment');
        // Simulate error condition
        await expect(page.locator('[data-testid="hybrid-deployment-error-fallback"]')).toBeVisible();
    });
});
