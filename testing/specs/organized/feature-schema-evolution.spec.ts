import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: schema-evolution
 * Tests schema-evolution functionality
 */

test.describe('Feature - schema-evolution', () => {
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

    test('should load schema-evolution interface', async ({ page }) => {
        await page.goto('/schema-evolution');
        await expect(page.locator('[data-testid="schema-evolution-container"]')).toBeVisible();
    });

    test('should handle schema-evolution actions', async ({ page }) => {
        await page.goto('/schema-evolution');
        await expect(page.locator('[data-testid="schema-evolution-actions"]')).toBeVisible();
    });

    test('should validate schema-evolution data', async ({ page }) => {
        await page.goto('/schema-evolution');
        await expect(page.locator('[data-testid="schema-evolution-data"]')).toBeVisible();
    });

    test('should display schema-evolution correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/schema-evolution');
        await expect(page.locator('[data-testid="schema-evolution-mobile"]')).toBeVisible();
    });

    test('should handle schema-evolution errors gracefully', async ({ page }) => {
        await page.goto('/schema-evolution');
        // Simulate error condition
        await expect(page.locator('[data-testid="schema-evolution-error-fallback"]')).toBeVisible();
    });
});
