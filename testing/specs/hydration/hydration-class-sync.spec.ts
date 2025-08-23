import { expect, test } from '@playwright/test';

test('no-flash theme script synchronizes html/body before hydration', async ({ page }) => {
    // Set language cookie and theme cookie pre-navigation
    await page.context().addCookies([
        { name: 'rp_lang', value: 'ar', domain: 'localhost', path: '/' },
        { name: 'rp_theme', value: encodeURIComponent(JSON.stringify({ theme: 'dark' })), domain: 'localhost', path: '/' }
    ]);

    const [response] = await Promise.all([
        page.waitForResponse(r => r.url().includes('/') && r.status() === 200),
        page.goto('/')
    ]);
    expect(response.ok()).toBeTruthy();

    // Immediately check html attributes and body class without waiting for network idle
    const htmlDir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    const htmlLang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
    const bodyClass = await page.evaluate(() => document.body.className);

    expect(htmlLang).toBe('ar');
    expect(htmlDir).toBe('rtl');
    expect(bodyClass).toContain('theme-dark');
    expect(bodyClass).toContain('lang-ar');
    // Should include dark class when theme=dark
    expect(bodyClass.split(' ')).toContain('dark');
});
