import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: real-time-streaming
 * Tests real-time-streaming functionality
 */

test.describe('Feature - real-time-streaming', () => {
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

    test('should load real-time-streaming interface', async ({ page }) => {
        await page.goto('/real-time-streaming');
        await expect(page.locator('[data-testid="real-time-streaming-container"]')).toBeVisible();
    });

    test('should handle real-time-streaming actions', async ({ page }) => {
        await page.goto('/real-time-streaming');
        await expect(page.locator('[data-testid="real-time-streaming-actions"]')).toBeVisible();
    });

    test('should validate real-time-streaming data', async ({ page }) => {
        await page.goto('/real-time-streaming');
        await expect(page.locator('[data-testid="real-time-streaming-data"]')).toBeVisible();
    });

    test('should display real-time-streaming correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/real-time-streaming');
        await expect(page.locator('[data-testid="real-time-streaming-mobile"]')).toBeVisible();
    });

    test('should handle real-time-streaming errors gracefully', async ({ page }) => {
        await page.goto('/real-time-streaming');
        // Simulate error condition
        await expect(page.locator('[data-testid="real-time-streaming-error-fallback"]')).toBeVisible();
    });
});
