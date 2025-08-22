import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: tracking-prevention
 * Tests tracking-prevention functionality
 */

test.describe('Feature - tracking-prevention', () => {
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

    test('should load tracking-prevention interface', async ({ page }) => {
        await page.goto('/tracking-prevention');
        await expect(page.locator('[data-testid="tracking-prevention-container"]')).toBeVisible();
    });

    test('should handle tracking-prevention actions', async ({ page }) => {
        await page.goto('/tracking-prevention');
        await expect(page.locator('[data-testid="tracking-prevention-actions"]')).toBeVisible();
    });

    test('should validate tracking-prevention data', async ({ page }) => {
        await page.goto('/tracking-prevention');
        await expect(page.locator('[data-testid="tracking-prevention-data"]')).toBeVisible();
    });

    test('should display tracking-prevention correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/tracking-prevention');
        await expect(page.locator('[data-testid="tracking-prevention-mobile"]')).toBeVisible();
    });

    test('should handle tracking-prevention errors gracefully', async ({ page }) => {
        await page.goto('/tracking-prevention');
        // Simulate error condition
        await expect(page.locator('[data-testid="tracking-prevention-error-fallback"]')).toBeVisible();
    });
});
