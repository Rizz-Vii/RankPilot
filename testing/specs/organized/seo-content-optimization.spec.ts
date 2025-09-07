import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * SEO Platform - Content Optimization Tests
 * Tests content optimization and analysis features
 */

test.describe("SEO Platform - Content Optimization", () => {
  let auth: EnhancedAuth;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    auth = new EnhancedAuth(page);

    try {
      const testUser = UNIFIED_TEST_USERS.agency;
      await auth.loginAndGoToDashboard(testUser);
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : String(error);
      console.warn("Login failed, using fallback:", msg);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should access content analyzer tool", async ({ page }) => {
    await page.goto("/content-analyzer");
    await expect(page.locator("h1")).toContainText(["Content", "Analyzer"]);
    await expect(page.locator('[data-testid="url-input"]')).toBeVisible();
  });

  test("should analyze page content for SEO", async ({ page }) => {
    await page.goto("/content-analyzer");

    // Input URL for analysis
    await page.fill('[data-testid="url-input"]', "https://example.com");
    await page.click('[data-testid="analyze-content"]');

    // Wait for analysis results
    await expect(page.locator('[data-testid="content-analysis"]')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="seo-score"]')).toContainText(
      /\d+/
    );
  });

  test("should provide content optimization suggestions", async ({ page }) => {
    await page.goto("/content-analyzer");
    await page.fill('[data-testid="url-input"]', "https://example.com/blog");
    await page.click('[data-testid="analyze-content"]');

    await expect(
      page.locator('[data-testid="optimization-suggestions"]')
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.locator('[data-testid="content-recommendations"]')
    ).toBeVisible();
  });

  test("should check content readability", async ({ page }) => {
    await page.goto("/content-analyzer");
    await page.fill('[data-testid="url-input"]', "https://example.com/article");
    await page.click('[data-testid="analyze-content"]');

    await expect(page.locator('[data-testid="readability-score"]')).toBeVisible(
      { timeout: 30000 }
    );
    await expect(page.locator('[data-testid="flesch-score"]')).toContainText(
      /\d+/
    );
  });

  test("should analyze keyword density", async ({ page }) => {
    await page.goto("/content-analyzer");
    await page.fill('[data-testid="url-input"]', "https://example.com/page");
    await page.click('[data-testid="analyze-content"]');

    await expect(page.locator('[data-testid="keyword-density"]')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="density-chart"]')).toBeVisible();
  });

  test("should check meta tags optimization", async ({ page }) => {
    await page.goto("/content-analyzer");
    await page.fill('[data-testid="url-input"]', "https://example.com");
    await page.click('[data-testid="analyze-content"]');

    await expect(page.locator('[data-testid="meta-analysis"]')).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.locator('[data-testid="meta-recommendations"]')
    ).toBeVisible();
  });

  test("should analyze internal linking structure", async ({ page }) => {
    await page.goto("/content-analyzer");
    await page.fill('[data-testid="url-input"]', "https://example.com");
    await page.click('[data-testid="analyze-content"]');

    await expect(page.locator('[data-testid="internal-links"]')).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.locator('[data-testid="link-opportunities"]')
    ).toBeVisible();
  });

  test("should provide content gap analysis", async ({ page }) => {
    await page.goto("/content-analyzer/gaps");
    await expect(page.locator('[data-testid="content-gaps"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="gap-opportunities"]')
    ).toBeVisible();
  });

  test("should generate content briefs", async ({ page }) => {
    await page.goto("/content-analyzer/briefs");
    await expect(page.locator('[data-testid="content-briefs"]')).toBeVisible();
    await expect(page.locator('[data-testid="brief-generator"]')).toBeVisible();
  });
});
