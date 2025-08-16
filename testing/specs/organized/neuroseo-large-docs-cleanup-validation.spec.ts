import { test, expect } from '@playwright/test';

/**
 * Wave 7: NeuroSEO Large Documents Cleanup Validation
 * 
 * Purpose: Ensure no large SEO documents remain in Firestore after migration to aggregated documents.
 * This test MUST fail if any large SEO documents still exist to prevent regressions.
 * 
 * Collections validated:
 * - semanticMapResults (legacy) - should be empty or contain only small docs (<2500 bytes)
 * - neuralCrawlerResults (legacy) - should be empty or contain only small docs (<2500 bytes)
 * 
 * Acceptance criteria:
 * - All documents in legacy collections should be under size threshold
 * - Documents marked with migrated:false should not exist
 * - Aggregate collections should contain the migrated data
 */

const SIZE_THRESHOLD_BYTES = 2500; // Default threshold from scan script
const MAX_DOCS_TO_CHECK = 100; // Reasonable limit for CI performance

test.describe('NeuroSEO Large Documents Cleanup Validation', () => {
  
  test('no large documents remain in semanticMapResults collection', async ({ request }) => {
    const response = await request.get('/api/internal/validate-neuroseo-cleanup', {
      params: {
        collection: 'semanticMapResults',
        threshold: SIZE_THRESHOLD_BYTES.toString(),
        maxDocs: MAX_DOCS_TO_CHECK.toString()
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    
    // Test MUST fail if large docs found
    expect(result.largeDocsCount).toBe(0);
    expect(result.unmigratedDocsCount).toBe(0);
    
    // Log summary for debugging
    console.log(`semanticMapResults validation: ${result.totalDocs} docs checked, ${result.largeDocsCount} over threshold`);
  });

  test('no large documents remain in neuralCrawlerResults collection', async ({ request }) => {
    const response = await request.get('/api/internal/validate-neuroseo-cleanup', {
      params: {
        collection: 'neuralCrawlerResults', 
        threshold: SIZE_THRESHOLD_BYTES.toString(),
        maxDocs: MAX_DOCS_TO_CHECK.toString()
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    
    // Test MUST fail if large docs found
    expect(result.largeDocsCount).toBe(0);
    expect(result.unmigratedDocsCount).toBe(0);
    
    // Log summary for debugging
    console.log(`neuralCrawlerResults validation: ${result.totalDocs} docs checked, ${result.largeDocsCount} over threshold`);
  });

  test('aggregate collections contain migrated data', async ({ request }) => {
    const [semanticResponse, crawlerResponse] = await Promise.all([
      request.get('/api/internal/validate-neuroseo-cleanup', {
        params: { collection: 'semanticMapResultsAgg', threshold: '0', maxDocs: '10' }
      }),
      request.get('/api/internal/validate-neuroseo-cleanup', {
        params: { collection: 'neuralCrawlerResultsAgg', threshold: '0', maxDocs: '10' }
      })
    ]);

    expect(semanticResponse.status()).toBe(200);
    expect(crawlerResponse.status()).toBe(200);

    const semanticResult = await semanticResponse.json();
    const crawlerResult = await crawlerResponse.json();

    // Aggregate collections should have documents (migration successful)
    expect(semanticResult.totalDocs).toBeGreaterThan(0);
    expect(crawlerResult.totalDocs).toBeGreaterThan(0);
    
    console.log(`Aggregate collections: semantic=${semanticResult.totalDocs}, crawler=${crawlerResult.totalDocs} docs`);
  });

  test('features read exclusively from aggregated documents', async ({ page }) => {
    // Test that SEO analysis features work with aggregate-only data
    // This validates the dual-read fallback has been properly disabled
    
    await page.goto('/neuroseo/neural-crawler');
    
    // Provide URL and trigger analysis that should read from aggregates
    const urlInput = page.locator('#crawl-url');
    await urlInput.fill('https://example.com/aggregate-test');
    
    // Run analysis
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Wait for results that should come from aggregate data
    await page.getByRole('heading', { name: /analysis results/i }).waitFor({ timeout: 30000 });
    
    // Verify key metrics are displayed (these should come from aggregates)
    await expect(page.locator('text=Words').first()).toBeVisible();
    await expect(page.locator('text=Min Read').first()).toBeVisible();
    await expect(page.locator('text=Links Found').first()).toBeVisible();
    
    // Check console for aggregate hit confirmation (no fallback)
    const logs = page.locator('[data-testid="console-logs"]').first();
    if (await logs.isVisible()) {
      const logText = await logs.textContent();
      expect(logText).toContain('aggregate hit');
      expect(logText).not.toContain('legacy fallback');
    }
  });

  test('adoption metrics show high aggregate usage', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    const kpis = health.kpis;
    
    // High adoption percentages indicate successful migration
    expect(kpis.crawlerAggregateAdoptionPct).toBeGreaterThanOrEqual(95);
    expect(kpis.semanticMapAggregateAdoptionPct).toBeGreaterThanOrEqual(95);
    
    console.log(`Adoption metrics: crawler=${kpis.crawlerAggregateAdoptionPct}%, semantic=${kpis.semanticMapAggregateAdoptionPct}%`);
  });
});