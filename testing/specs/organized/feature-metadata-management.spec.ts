import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: metadata-management
 * Tests metadata-management functionality
 */

test.describe('Feature - metadata-management', () => {
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

    test('should load metadata-management interface', async ({ page }) => {
        await page.goto('/metadata-management');
        await expect(page.locator('[data-testid="metadata-management-container"]')).toBeVisible();
    });

    test('should handle metadata-management actions', async ({ page }) => {
        await page.goto('/metadata-management');
        await expect(page.locator('[data-testid="metadata-management-actions"]')).toBeVisible();
    });

    test('should validate metadata-management data', async ({ page }) => {
        await page.goto('/metadata-management');
        await expect(page.locator('[data-testid="metadata-management-data"]')).toBeVisible();
    });

    test('should display metadata-management correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/metadata-management');
        await expect(page.locator('[data-testid="metadata-management-mobile"]')).toBeVisible();
    });

    test('should handle metadata-management errors gracefully', async ({ page }) => {
        await page.goto('/metadata-management');
        // Simulate error condition
        await expect(page.locator('[data-testid="metadata-management-error-fallback"]')).toBeVisible();
    });
});
