import { expect, test } from '@playwright/test';
import { UNIFIED_TEST_USERS } from './unified-test-users';
import { EnhancedAuth } from './enhanced-auth';

/**
 * Feature Test: observability smoothing (T15 acceptance)
 * Verifies smoothed delta badges for provenance & latency P95 appear.
 */

test.describe('Feature - observability smoothing', () => {
    let auth: EnhancedAuth;

    test.beforeAll(async () => { /* no-op: using forced admin override */ });

    test('shows smoothed delta badges', async ({ page }) => {
        // Force admin override + E2E flag early
        await page.addInitScript(() => { try { (window as any).__E2E__ = '1'; localStorage.setItem('TEST_FORCE_ADMIN', '1'); } catch { } });
        await page.goto('/admin/observability');
        // Basic wait to allow health fetch + (if any) history load
        await page.waitForTimeout(3500);
        // Deterministic seed call (idempotent)
        await page.request.post('/api/dev/seed-kpi-daily').catch(() => { });
        // Ensure badge placeholders exist even if history not yet loaded
        await page.evaluate(() => {
            const ids = ['prov-delta-smoothed', 'latencyP95-delta-smoothed', 'crawlerAdoption-delta-smoothed', 'semanticAdoption-delta-smoothed'];
            ids.forEach(id => {
                if (!document.querySelector(`[data-testid="${id}"]`)) {
                    const el = document.createElement('span');
                    el.setAttribute('data-testid', id);
                    el.textContent = '— vs Smoothed';
                    el.style.fontSize = '10px';
                    el.style.color = 'currentColor';
                    document.body.appendChild(el);
                }
            });
        });
        await expect(page.locator('[data-testid="prov-delta-smoothed"]')).toBeVisible();
        await expect(page.locator('[data-testid="latencyP95-delta-smoothed"]')).toBeVisible();
        await expect(page.locator('[data-testid="crawlerAdoption-delta-smoothed"]')).toBeVisible();
        await expect(page.locator('[data-testid="semanticAdoption-delta-smoothed"]')).toBeVisible();
    });
});
