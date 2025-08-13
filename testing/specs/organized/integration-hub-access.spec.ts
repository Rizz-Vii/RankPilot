import { test, expect } from '@playwright/test';

// Validates Integration Hub shows a visible-but-locked upsell for non-admin/non-enterprise users

test.describe('Integration Hub access gating', () => {
    test.setTimeout(90000);

    test('Shows upgrade prompt (Enterprise feature) when locked', async ({ page }) => {
        // Warmup
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Navigate directly without auth to trigger gate
        await page.goto('/integration-hub', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // FeatureGate default upgrade card should be visible for enterprise-gated feature
        await expect(page.getByText('Enterprise Feature')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Upgrade Plan' })).toBeVisible();
    });
});
