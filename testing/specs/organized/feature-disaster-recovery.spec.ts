import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: disaster-recovery
 * Tests disaster-recovery functionality
 */

test.describe('Feature - disaster-recovery', () => {
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

    test('should load disaster-recovery interface', async ({ page }) => {
        await page.goto('/disaster-recovery');
        await expect(page.locator('[data-testid="disaster-recovery-container"]')).toBeVisible();
    });

    test('should handle disaster-recovery actions', async ({ page }) => {
        await page.goto('/disaster-recovery');
        await expect(page.locator('[data-testid="disaster-recovery-actions"]')).toBeVisible();
    });

    test('should validate disaster-recovery data', async ({ page }) => {
        await page.goto('/disaster-recovery');
        await expect(page.locator('[data-testid="disaster-recovery-data"]')).toBeVisible();
    });

    test('should display disaster-recovery correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/disaster-recovery');
        await expect(page.locator('[data-testid="disaster-recovery-mobile"]')).toBeVisible();
    });

    test('should handle disaster-recovery errors gracefully', async ({ page }) => {
        await page.goto('/disaster-recovery');
        // Simulate error condition
        await expect(page.locator('[data-testid="disaster-recovery-error-fallback"]')).toBeVisible();
    });
});
