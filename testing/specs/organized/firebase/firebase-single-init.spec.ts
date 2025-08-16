import { test, expect } from '@playwright/test';

/**
 * Firebase Single Initialization Regression Test
 * Ensures we only emit the "🔥 Firebase app initialized" log once per browser context load.
 * Guards against accidental duplicate client-side initializeApp calls after module refactors / HMR churn.
 */

const INIT_LOG = '🔥 Firebase app initialized';

// We purposefully open two pages sequentially to ensure the shared worker / module graph
// does not re-emit the initialization log.

test.describe('Firebase single initialization', () => {
    test('only logs initialization once across multiple navigations', async ({ browser }) => {
        const context = await browser.newContext();
        const page1 = await context.newPage();
        const seen: string[] = [];
        page1.on('console', msg => {
            if (msg.type() === 'log' && msg.text().includes(INIT_LOG)) seen.push(msg.text());
        });

        await page1.goto('/', { waitUntil: 'domcontentloaded' });
        await page1.waitForTimeout(300); // allow any late logs

        // Open a second page within same context (re-using service workers / shared modules)
        const page2 = await context.newPage();
        page2.on('console', msg => {
            if (msg.type() === 'log' && msg.text().includes(INIT_LOG)) seen.push('second:' + msg.text());
        });
        await page2.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await page2.waitForTimeout(300);

        // Expect exactly one initialization log
        expect.soft(seen.filter(l => l.includes(INIT_LOG)).length, 'Initialization log count').toBe(1);

        // Defensive: if more than one, surface them for debugging
        if (seen.length > 1) {
            console.log('Duplicate init logs captured:', seen);
        }

        await context.close();
    });
});
