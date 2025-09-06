import { expect, test } from '@playwright/test'; // @rbac @gating

// Lightweight dynamic checks for a subset of feature gated pages to ensure markers are consistent.
// NOTE: Not every feature key has a dedicated page; we target known settings pages.
const gatedPaths: Array<{ path: string; requires: 'agency' | 'enterprise'; description: string }> = [
    { path: '/settings/api', requires: 'enterprise', description: 'API access settings' },
    { path: '/settings/branding', requires: 'enterprise', description: 'White-label settings' },
    { path: '/team/settings', requires: 'agency', description: 'Team management settings' },
];

test.describe('Feature gate consistency', () => {
    for (const g of gatedPaths) {
        test(`starter project: gated marker present for ${g.description}`, async ({ page }) => {
            const isStarter = /starter/i.test(test.info().project.name || '');
            if (!isStarter) test.skip();
            await page.goto(g.path, { waitUntil: 'domcontentloaded' });
            const upgradeBanner = page.getByTestId('upgrade-banner');
            const deniedMarker = page.getByTestId('feature-gate-denied');
            // At least one gating indicator must exist
            expect(await upgradeBanner.count() + await deniedMarker.count()).toBeGreaterThan(0);
        });
        test(`enterprise project: no gating markers for ${g.description} when requires <= enterprise`, async ({ page }) => {
            const isEnterprise = /enterprise/i.test(test.info().project.name || '');
            if (!isEnterprise) test.skip();
            await page.goto(g.path, { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('upgrade-banner')).toHaveCount(0);
            await expect(page.getByTestId('feature-gate-denied')).toHaveCount(0);
        });
        if (g.requires === 'agency') {
            test(`agency project: no gating markers for ${g.description}`, async ({ page }) => {
                const isAgency = /agency/i.test(test.info().project.name || '');
                if (!isAgency) test.skip();
                await page.goto(g.path, { waitUntil: 'domcontentloaded' });
                await expect(page.getByTestId('upgrade-banner')).toHaveCount(0);
                await expect(page.getByTestId('feature-gate-denied')).toHaveCount(0);
            });
        }
    }
});
