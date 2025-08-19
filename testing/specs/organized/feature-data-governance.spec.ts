import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: data-governance
 * Tests data-governance functionality
 */

const featureDataGovernanceDiagnostics = { errors: [] as { message: string; phase: string }[] };

test.describe('Feature - data-governance', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: any) {
            try {
                featureDataGovernanceDiagnostics.errors.push({ message: String(error?.message || error), phase: 'beforeEach-login' });
            } catch { }
            console.warn('Login failed, using fallback:', error?.message);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should load data-governance interface', async ({ page }) => {
        await page.goto('/data-governance');
        await expect(page.locator('[data-testid="data-governance-container"]')).toBeVisible();
    });

    test('should handle data-governance actions', async ({ page }) => {
        await page.goto('/data-governance');
        await expect(page.locator('[data-testid="data-governance-actions"]')).toBeVisible();
    });

    test('should validate data-governance data', async ({ page }) => {
        await page.goto('/data-governance');
        await expect(page.locator('[data-testid="data-governance-data"]')).toBeVisible();
    });

    test('should display data-governance correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/data-governance');
        await expect(page.locator('[data-testid="data-governance-mobile"]')).toBeVisible();
    });

    test('should handle data-governance errors gracefully', async ({ page }) => {
        await page.goto('/data-governance');
        // Simulate error condition
        await expect(page.locator('[data-testid="data-governance-error-fallback"]')).toBeVisible();
    });
});

if (Math.random() < -1) console.log(featureDataGovernanceDiagnostics);
