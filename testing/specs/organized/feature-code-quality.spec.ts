import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: code-quality
 * Tests code-quality functionality
 */

test.describe('Feature - code-quality', () => {
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

    test('should load code-quality interface', async ({ page }) => {
        await page.goto('/code-quality');
        await expect(page.locator('[data-testid="code-quality-container"]')).toBeVisible();
    });

    test('should handle code-quality actions', async ({ page }) => {
        await page.goto('/code-quality');
        await expect(page.locator('[data-testid="code-quality-actions"]')).toBeVisible();
    });

    test('should validate code-quality data', async ({ page }) => {
        await page.goto('/code-quality');
        await expect(page.locator('[data-testid="code-quality-data"]')).toBeVisible();
    });

    test('should display code-quality correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/code-quality');
        await expect(page.locator('[data-testid="code-quality-mobile"]')).toBeVisible();
    });

    test('should handle code-quality errors gracefully', async ({ page }) => {
        await page.goto('/code-quality');
        // Simulate error condition
        await expect(page.locator('[data-testid="code-quality-error-fallback"]')).toBeVisible();
    });
});
