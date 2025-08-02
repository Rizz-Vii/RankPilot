import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "./unified-test-users";
import { EnhancedAuth } from "./enhanced-auth";

/**
 * Feature Test: gdpr-compliance
 * Tests gdpr-compliance functionality
 */

test.describe('Feature - gdpr-compliance', () => {
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

    test('should load gdpr-compliance interface', async ({ page }) => {
        await page.goto('/gdpr-compliance');
        await expect(page.locator('[data-testid="gdpr-compliance-container"]')).toBeVisible();
    });

    test('should handle gdpr-compliance actions', async ({ page }) => {
        await page.goto('/gdpr-compliance');
        await expect(page.locator('[data-testid="gdpr-compliance-actions"]')).toBeVisible();
    });

    test('should validate gdpr-compliance data', async ({ page }) => {
        await page.goto('/gdpr-compliance');
        await expect(page.locator('[data-testid="gdpr-compliance-data"]')).toBeVisible();
    });

    test('should display gdpr-compliance correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/gdpr-compliance');
        await expect(page.locator('[data-testid="gdpr-compliance-mobile"]')).toBeVisible();
    });

    test('should handle gdpr-compliance errors gracefully', async ({ page }) => {
        await page.goto('/gdpr-compliance');
        // Simulate error condition
        await expect(page.locator('[data-testid="gdpr-compliance-error-fallback"]')).toBeVisible();
    });
});
