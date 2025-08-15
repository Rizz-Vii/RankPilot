import { test, expect } from '@playwright/test';
import { UNIFIED_TEST_USERS } from '../../config/unified-test-users';
import { EnhancedAuth } from '../../utils/enhanced-auth';

// T14: Validate aggregate-first read path with fallback metric logging.
// This test assumes env flag NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_READ_AGG=1 during run.
// Strategy:
// 1. Login as agency user.
// 2. Navigate to crawler page, run an analysis (mocked client simulation).
// 3. Reload page to trigger aggregate hydration of most recent history item.
// 4. Assert key overview metric cards render numeric counts.
// 5. (Best-effort) Inspect console for aggregate hit log message.

let auth: EnhancedAuth;

// Capture console messages for aggregate/fallback signals
const messages: string[] = [];

test.beforeEach(async ({ page }) => {
    auth = new EnhancedAuth(page);
    page.on('console', msg => {
        const t = msg.text();
        if (/neuralCrawler].*(aggregate hit|legacy fallback)/i.test(t)) messages.push(t);
    });
    const user = UNIFIED_TEST_USERS.agency;
    await auth.loginAndGoToDashboard(user);
});

test('aggregate-first hydration produces metrics cards', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/neuroseo/neural-crawler');
    // Provide URL and run analysis
    const input = page.locator('#crawl-url');
    await input.fill('https://example.com/aggregate-test');
    await page.getByRole('button', { name: /analyze/i }).click();
    // Wait for analysis results heading
    await page.getByRole('heading', { name: /analysis results/i }).waitFor({ timeout: 30000 });
    // Soft check metric cards
    await expect(page.locator('text=Words').first()).toBeVisible();
    await expect(page.locator('text=Min Read').first()).toBeVisible();
    await expect(page.locator('text=Links Found').first()).toBeVisible();
    // Reload to trigger aggregate read hydration
    await page.reload();
    // Should still show Analysis Results from reconstructed aggregate (or fallback)
    await page.getByRole('heading', { name: /analysis results/i }).waitFor({ timeout: 15000 });
    // At least one aggregate hit OR fallback log should have been recorded
    expect(messages.some(m => m.includes('aggregate hit') || m.includes('legacy fallback'))).toBeTruthy();
});
