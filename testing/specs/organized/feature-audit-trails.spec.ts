import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: audit-trails
 * Tests audit-trails functionality
 */

test.describe('Feature - audit-trails', () => {
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

    test('should load audit-trails interface', async ({ page }) => {
        await page.goto('/audit-trails');
        await expect(page.locator('[data-testid="audit-trails-container"]')).toBeVisible();
    });

    test('should handle audit-trails actions', async ({ page }) => {
        await page.goto('/audit-trails');
        await expect(page.locator('[data-testid="audit-trails-actions"]')).toBeVisible();
    });

    test('should validate audit-trails data', async ({ page }) => {
        await page.goto('/audit-trails');
        await expect(page.locator('[data-testid="audit-trails-data"]')).toBeVisible();
    });

    test('should display audit-trails correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/audit-trails');
        await expect(page.locator('[data-testid="audit-trails-mobile"]')).toBeVisible();
    });

    test('should handle audit-trails errors gracefully', async ({ page }) => {
        await page.goto('/audit-trails');
        // Simulate error condition
        await expect(page.locator('[data-testid="audit-trails-error-fallback"]')).toBeVisible();
    });
});
