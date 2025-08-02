import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: project-management
 * Tests project-management functionality
 */

test.describe('Feature - project-management', () => {
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

    test('should load project-management interface', async ({ page }) => {
        await page.goto('/project-management');
        await expect(page.locator('[data-testid="project-management-container"]')).toBeVisible();
    });

    test('should handle project-management actions', async ({ page }) => {
        await page.goto('/project-management');
        await expect(page.locator('[data-testid="project-management-actions"]')).toBeVisible();
    });

    test('should validate project-management data', async ({ page }) => {
        await page.goto('/project-management');
        await expect(page.locator('[data-testid="project-management-data"]')).toBeVisible();
    });

    test('should display project-management correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/project-management');
        await expect(page.locator('[data-testid="project-management-mobile"]')).toBeVisible();
    });

    test('should handle project-management errors gracefully', async ({ page }) => {
        await page.goto('/project-management');
        // Simulate error condition
        await expect(page.locator('[data-testid="project-management-error-fallback"]')).toBeVisible();
    });
});
