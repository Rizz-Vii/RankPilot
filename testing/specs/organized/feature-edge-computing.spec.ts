import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: edge-computing
 * Tests edge-computing functionality
 */

test.describe('Feature - edge-computing', () => {
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

    test('should load edge-computing interface', async ({ page }) => {
        await page.goto('/edge-computing');
        await expect(page.locator('[data-testid="edge-computing-container"]')).toBeVisible();
    });

    test('should handle edge-computing actions', async ({ page }) => {
        await page.goto('/edge-computing');
        await expect(page.locator('[data-testid="edge-computing-actions"]')).toBeVisible();
    });

    test('should validate edge-computing data', async ({ page }) => {
        await page.goto('/edge-computing');
        await expect(page.locator('[data-testid="edge-computing-data"]')).toBeVisible();
    });

    test('should display edge-computing correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/edge-computing');
        await expect(page.locator('[data-testid="edge-computing-mobile"]')).toBeVisible();
    });

    test('should handle edge-computing errors gracefully', async ({ page }) => {
        await page.goto('/edge-computing');
        // Simulate error condition
        await expect(page.locator('[data-testid="edge-computing-error-fallback"]')).toBeVisible();
    });
});
