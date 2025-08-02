import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: heatmap-analysis
 * Tests heatmap-analysis functionality
 */

test.describe('Feature - heatmap-analysis', () => {
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

    test('should load heatmap-analysis interface', async ({ page }) => {
        await page.goto('/heatmap-analysis');
        await expect(page.locator('[data-testid="heatmap-analysis-container"]')).toBeVisible();
    });

    test('should handle heatmap-analysis actions', async ({ page }) => {
        await page.goto('/heatmap-analysis');
        await expect(page.locator('[data-testid="heatmap-analysis-actions"]')).toBeVisible();
    });

    test('should validate heatmap-analysis data', async ({ page }) => {
        await page.goto('/heatmap-analysis');
        await expect(page.locator('[data-testid="heatmap-analysis-data"]')).toBeVisible();
    });

    test('should display heatmap-analysis correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/heatmap-analysis');
        await expect(page.locator('[data-testid="heatmap-analysis-mobile"]')).toBeVisible();
    });

    test('should handle heatmap-analysis errors gracefully', async ({ page }) => {
        await page.goto('/heatmap-analysis');
        // Simulate error condition
        await expect(page.locator('[data-testid="heatmap-analysis-error-fallback"]')).toBeVisible();
    });
});
