import { test, expect } from '@playwright/test';

// Lightweight integrity checks for provenance & insights (Task F)

test.describe('Provenance & Insights Integrity', () => {
    test('Insights page has no synthetic placeholder strings', async ({ page }) => {
        await page.goto('/insights');
        await page.waitForSelector('[data-testid="insights-page"]');
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain('Placeholder content for');
    });

    test('Provenance badge only appears when provenance set (AI Visibility)', async ({ page }) => {
        await page.goto('/neuroseo/ai-visibility');
        const header = page.locator('main');
        const initialBadgesText = await header.innerText();
        expect(initialBadgesText).not.toMatch(/Live Data|Cache|Demo Data/);
    });
});
