import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * User Experience - Navigation & Interface Tests
 */

test.describe('User Experience - Navigation & Interface', () => {
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

    test('should display main navigation correctly', async ({ page }) => {
        await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
        await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
        await expect(page.locator('[data-testid="nav-neuroseo"]')).toBeVisible();
    });

    test('should have responsive mobile navigation', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();

        await page.click('[data-testid="mobile-nav-toggle"]');
        await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    });

    test('should maintain navigation state across pages', async ({ page }) => {
        await page.goto('/keywords');
        await expect(page.locator('[data-testid="nav-keywords"]')).toHaveClass(/active/);

        await page.goto('/content-analyzer');
        await expect(page.locator('[data-testid="nav-content"]')).toHaveClass(/active/);
    });

    test('should display breadcrumb navigation', async ({ page }) => {
        await page.goto('/neuroseo/advanced');
        await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
        await expect(page.locator('[data-testid="breadcrumb"]')).toContainText(['Dashboard', 'NeuroSEO', 'Advanced']);
    });

    test('should have accessible keyboard navigation', async ({ page }) => {
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        // Should navigate to first focusable element
        await expect(page.locator(':focus')).toBeVisible();
    });

    test('should display loading states appropriately', async ({ page }) => {
        await page.goto('/content-analyzer');
        await page.fill('[data-testid="url-input"]', 'https://example.com');
        await page.click('[data-testid="analyze-content"]');

        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    });

    test('should handle error states gracefully', async ({ page }) => {
        await page.goto('/invalid-route');
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="back-to-dashboard"]')).toBeVisible();
    });

    test('should display user feedback notifications', async ({ page }) => {
        // Trigger an action that shows notification
        await page.goto('/profile');
        await page.fill('[data-testid="user-name"]', 'Updated Name');
        await page.click('[data-testid="save-profile"]');

        await expect(page.locator('[data-testid="success-notification"]')).toBeVisible({ timeout: 10000 });
    });
});
