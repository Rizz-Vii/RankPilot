import { test, expect } from '@playwright/test';

/**
 * Regression: Ensure pricing page never displays an "Admin" plan name.
 * Admin tier is an internal elevation mapping to Enterprise; UI must remain canonical.
 */

test.describe('Pricing plan name integrity', () => {
    test('no Admin plan label appears', async ({ page }) => {
        await page.goto('/pricing');
        await expect(page.locator('h1:has-text("Pricing")')).toBeVisible();
        const allText = await page.locator('body').innerText();
        // Allow lower-case incidental 'admin' in unrelated contexts but not capitalized plan header
        expect(allText).not.toMatch(/\bAdmin Plan\b/);
        expect(allText).not.toMatch(/\bAdmin\s+\$/); // name followed by price indicator
    });
});
