import { test, expect } from '@playwright/test';
import { EnhancedAuth } from './enhanced-auth';
import { UNIFIED_TEST_USERS } from './unified-test-users';

/**
 * PR2 Dashboard Feature Gating Verification
 * Validates cross-domain dashboard nav items reflect feature access:
 * - Starter: Sales + Finance enabled, Marketing locked (aria-disabled)
 * - Enterprise: Marketing unlocked
 * (Free user path implicitly covered via dev user fallback elsewhere.)
 */

test.describe('Feature Gating · Dashboards', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        auth = new EnhancedAuth(page);
    });

    test('starter tier: marketing dashboard locked', async ({ page }) => {
        await auth.loginAndGoToDashboard(UNIFIED_TEST_USERS.starter);
        const sales = page.locator('nav a:has-text("Sales Dashboard")');
        const finance = page.locator('nav a:has-text("Finance Dashboard")');
        const marketing = page.locator('nav a:has-text("Marketing Dashboard")');
        await expect(sales).toBeVisible();
        await expect(finance).toBeVisible();
        await expect(marketing).toBeVisible();
        await expect(sales).not.toHaveAttribute('aria-disabled', 'true');
        await expect(finance).not.toHaveAttribute('aria-disabled', 'true');
        await expect(marketing).toHaveAttribute('aria-disabled', 'true');
    });

    test('enterprise tier: marketing dashboard unlocked', async ({ page }) => {
        await auth.loginAndGoToDashboard(UNIFIED_TEST_USERS.enterprise);
        const marketing = page.locator('nav a:has-text("Marketing Dashboard")');
        await expect(marketing).toBeVisible();
        await expect(marketing).not.toHaveAttribute('aria-disabled', 'true');
    });
});
