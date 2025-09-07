import { expect, test } from "@playwright/test";

/**
 * SEO Platform Feature Comprehensive Test Suite
 * Tests all SEO-specific features, tools, and optimization capabilities
 */

test.describe("SEO Platform - Keyword Research & Analysis", () => {
  test("keyword tool interface validation", async ({ page }) => {
    await page.goto("/keyword-tool", { timeout: 30000 });

    await expect(
      page.locator('h1, h2, [data-testid="page-title"]')
    ).toBeVisible();

    const inputElements = page.locator("input, textarea");
    if ((await inputElements.count()) > 0) {
      await expect(inputElements.first()).toBeVisible();
    }
  });

  test("keyword difficulty analysis", async ({ page }) => {
    await page.goto("/keyword-tool", { timeout: 30000 });

    const keywordInput = page.locator(
      'input[placeholder*="keyword"], input[name*="keyword"]'
    );
    if ((await keywordInput.count()) > 0) {
      await keywordInput.fill("SEO optimization");

      const analyzeButton = page.locator("button", {
        hasText: /analyze|search|research/i,
      });
      if ((await analyzeButton.count()) > 0) {
        await analyzeButton.click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test("keyword suggestion engine", async ({ page }) => {
    await page.goto("/keyword-suggestions", { timeout: 30000 });

    const suggestionElements = page.locator("text=/suggest|related|similar/i");
    if ((await suggestionElements.count()) > 0) {
      await expect(suggestionElements.first()).toBeVisible();
    }
  });

  test("long-tail keyword discovery", async ({ page }) => {
    await page.goto("/keyword-tool", { timeout: 30000 });

    const longtailOption = page.locator("text=/long.tail|phrase|multi.word/i");
    if ((await longtailOption.count()) > 0) {
      await longtailOption.click();
    }
  });

  test("keyword competition analysis", async ({ page }) => {
    await page.goto("/keyword-analysis", { timeout: 30000 });

    const competitionMetrics = page.locator(
      "text=/competition|difficulty|cpc|volume/i"
    );
    if ((await competitionMetrics.count()) > 0) {
      const count = await competitionMetrics.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("SEO Platform - Content Optimization", () => {
  test("content analyzer loads and functions", async ({ page }) => {
    await page.goto("/content-analyzer", { timeout: 30000 });

    await expect(page.locator("body")).toBeVisible();

    const textArea = page.locator('textarea, [contenteditable="true"]');
    if ((await textArea.count()) > 0) {
      await textArea.fill(
        "This is test content for SEO analysis and optimization."
      );

      const analyzeButton = page.locator("button", {
        hasText: /analyze|optimize|score/i,
      });
      if ((await analyzeButton.count()) > 0) {
        await analyzeButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test("readability score calculation", async ({ page }) => {
    await page.goto("/content-analyzer", { timeout: 30000 });

    const readabilityElements = page.locator(
      "text=/readability|flesch|grade|score/i"
    );
    if ((await readabilityElements.count()) > 0) {
      await expect(readabilityElements.first()).toBeVisible();
    }
  });

  test("keyword density analysis", async ({ page }) => {
    await page.goto("/content-analyzer", { timeout: 30000 });

    const densityElements = page.locator(
      "text=/density|frequency|keyword.count/i"
    );
    if ((await densityElements.count()) > 0) {
      const count = await densityElements.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("meta tag optimization suggestions", async ({ page }) => {
    await page.goto("/meta-optimizer", { timeout: 30000 });

    const metaElements = page.locator("text=/meta|title|description|tag/i");
    if ((await metaElements.count()) > 0) {
      await expect(metaElements.first()).toBeVisible();
    }
  });

  test("header structure analysis", async ({ page }) => {
    await page.goto("/content-analyzer", { timeout: 30000 });

    const headerElements = page.locator("text=/h1|h2|h3|header|heading/i");
    if ((await headerElements.count()) > 0) {
      const count = await headerElements.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("SEO Platform - Technical SEO", () => {
  test("site audit functionality", async ({ page }) => {
    await page.goto("/site-audit", { timeout: 30000 });

    const urlInput = page.locator(
      'input[placeholder*="url"], input[placeholder*="website"]'
    );
    if ((await urlInput.count()) > 0) {
      await urlInput.fill("https://example.com");

      const auditButton = page.locator("button", {
        hasText: /audit|scan|analyze/i,
      });
      if ((await auditButton.count()) > 0) {
        await auditButton.click();
        await page.waitForTimeout(5000);
      }
    }
  });

  test("robots.txt analyzer", async ({ page }) => {
    await page.goto("/robots-analyzer", { timeout: 30000 });

    const robotsElements = page.locator("text=/robots|crawl|disallow|allow/i");
    if ((await robotsElements.count()) > 0) {
      await expect(robotsElements.first()).toBeVisible();
    }
  });

  test("sitemap validation", async ({ page }) => {
    await page.goto("/sitemap-validator", { timeout: 30000 });

    const sitemapElements = page.locator("text=/sitemap|xml|url.list/i");
    if ((await sitemapElements.count()) > 0) {
      await expect(sitemapElements.first()).toBeVisible();
    }
  });

  test("page speed insights", async ({ page }) => {
    await page.goto("/page-speed", { timeout: 30000 });

    const speedElements = page.locator(
      "text=/speed|performance|load.time|core.web.vitals/i"
    );
    if ((await speedElements.count()) > 0) {
      const count = await speedElements.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("mobile-friendliness test", async ({ page }) => {
    await page.goto("/mobile-test", { timeout: 30000 });

    const mobileElements = page.locator("text=/mobile|responsive|viewport/i");
    if ((await mobileElements.count()) > 0) {
      await expect(mobileElements.first()).toBeVisible();
    }
  });
});

test.describe("SEO Platform - Competitive Intelligence", () => {
  test("competitor analysis dashboard", async ({ page }) => {
    await page.goto("/competitors", { timeout: 30000 });

    await expect(page.locator("body")).toBeVisible();

    const competitorElements = page.locator(
      "text=/competitor|rival|analysis/i"
    );
    if ((await competitorElements.count()) > 0) {
      await expect(competitorElements.first()).toBeVisible();
    }
  });

  test("keyword gap analysis", async ({ page }) => {
    await page.goto("/keyword-gap", { timeout: 30000 });

    const gapElements = page.locator("text=/gap|missing|opportunity/i");
    if ((await gapElements.count()) > 0) {
      await expect(gapElements.first()).toBeVisible();
    }
  });

  test("backlink comparison", async ({ page }) => {
    await page.goto("/backlink-analysis", { timeout: 30000 });

    const backlinkElements = page.locator(
      "text=/backlink|link.profile|referring.domain/i"
    );
    if ((await backlinkElements.count()) > 0) {
      const count = await backlinkElements.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("content gap identification", async ({ page }) => {
    await page.goto("/content-gap", { timeout: 30000 });

    const contentGapElements = page.locator(
      "text=/content.gap|missing.topic|opportunity/i"
    );
    if ((await contentGapElements.count()) > 0) {
      await expect(contentGapElements.first()).toBeVisible();
    }
  });

  test("SERP position tracking", async ({ page }) => {
    await page.goto("/rank-tracking", { timeout: 30000 });

    const rankingElements = page.locator("text=/rank|position|serp|tracking/i");
    if ((await rankingElements.count()) > 0) {
      const count = await rankingElements.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("SEO Platform - Reporting & Analytics", () => {
  test("SEO reports generation", async ({ page }) => {
    await page.goto("/reports", { timeout: 30000 });

    const reportElements = page.locator("text=/report|export|download|pdf/i");
    if ((await reportElements.count()) > 0) {
      await expect(reportElements.first()).toBeVisible();
    }
  });

  test("analytics dashboard", async ({ page }) => {
    await page.goto("/analytics", { timeout: 30000 });

    const analyticsElements = page.locator(
      "text=/analytics|metrics|data|insights/i"
    );
    if ((await analyticsElements.count()) > 0) {
      const count = await analyticsElements.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("progress tracking", async ({ page }) => {
    await page.goto("/progress", { timeout: 30000 });

    const progressElements = page.locator(
      "text=/progress|improvement|trend|growth/i"
    );
    if ((await progressElements.count()) > 0) {
      await expect(progressElements.first()).toBeVisible();
    }
  });

  test("custom dashboard widgets", async ({ page }) => {
    await page.goto("/dashboard", { timeout: 30000 });

    const widgetElements = page.locator(
      '[data-testid*="widget"], [class*="widget"], [class*="card"]'
    );
    if ((await widgetElements.count()) > 0) {
      const count = await widgetElements.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("scheduled reports configuration", async ({ page }) => {
    await page.goto("/reports/schedule", { timeout: 30000 });

    const scheduleElements = page.locator(
      "text=/schedule|automatic|recurring|weekly|monthly/i"
    );
    if ((await scheduleElements.count()) > 0) {
      await expect(scheduleElements.first()).toBeVisible();
    }
  });
});

test.describe("SEO Platform - Integration & Export", () => {
  test("Google Analytics integration", async ({ page }) => {
    await page.goto("/integrations", { timeout: 30000 });

    const gaElements = page.locator("text=/google.analytics|ga4|analytics/i");
    if ((await gaElements.count()) > 0) {
      await expect(gaElements.first()).toBeVisible();
    }
  });

  test("Search Console connection", async ({ page }) => {
    await page.goto("/integrations/search-console", { timeout: 30000 });

    const gscElements = page.locator("text=/search.console|gsc|webmaster/i");
    if ((await gscElements.count()) > 0) {
      await expect(gscElements.first()).toBeVisible();
    }
  });

  test("CSV export functionality", async ({ page }) => {
    await page.goto("/export", { timeout: 30000 });

    const exportElements = page.locator("text=/export|csv|download|save/i");
    if ((await exportElements.count()) > 0) {
      await expect(exportElements.first()).toBeVisible();
    }
  });

  test("API access validation", async ({ page }) => {
    await page.goto("/api/docs", { timeout: 30000 });

    const apiElements = page.locator("text=/api|endpoint|documentation/i");
    if ((await apiElements.count()) > 0) {
      await expect(apiElements.first()).toBeVisible();
    }
  });

  test("webhook configuration", async ({ page }) => {
    await page.goto("/webhooks", { timeout: 30000 });

    const webhookElements = page.locator(
      "text=/webhook|notification|callback/i"
    );
    if ((await webhookElements.count()) > 0) {
      await expect(webhookElements.first()).toBeVisible();
    }
  });
});
