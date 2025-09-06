import { expect, test } from '@playwright/test';

test.describe('Auth redirect', () => {
    test('protected route redirects to login when unauthenticated', async ({ page }) => {
        const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
        const protectedPath = '/dashboard';
        await page.goto(`${base}${protectedPath}`, { waitUntil: 'domcontentloaded' });
        // Wait for login form to appear if redirected
        await page.locator('form').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });
        const url = page.url();
        expect(url).toMatch(/\/login|\/signin|\/auth/);
    });
});
