import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * SEO Platform - Keyword Research & Analysis Tests
 * Tests keyword research and analysis functionality
 */

test.describe("SEO Platform - Keyword Research & Analysis", () => {
  let auth: EnhancedAuth;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    auth = new EnhancedAuth(page);

    try {
      const testUser = UNIFIED_TEST_USERS.starter;
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

  test("should access keyword research tool", async ({ page }) => {
    await page.goto("/keywords");
    await expect(page.locator("h1")).toContainText("Keyword");
    await expect(page.locator('[data-testid="keyword-input"]')).toBeVisible();
  });

  test("should perform keyword analysis", async ({ page }) => {
    await page.goto("/keywords");

    // Input keyword for analysis
    await page.fill('[data-testid="keyword-input"]', "SEO optimization");
    await page.click('[data-testid="analyze-keyword"]');

    // Wait for results
    await expect(page.locator('[data-testid="keyword-results"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="search-volume"]')).toContainText(
      /\d+/
    );
  });

  test("should display keyword difficulty scores", async ({ page }) => {
    await page.goto("/keywords");
    await page.fill('[data-testid="keyword-input"]', "digital marketing");
    await page.click('[data-testid="analyze-keyword"]');

    await expect(page.locator('[data-testid="difficulty-score"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('[data-testid="competition-level"]')
    ).toBeVisible();
  });

  test("should show related keywords", async ({ page }) => {
    await page.goto("/keywords");
    await page.fill('[data-testid="keyword-input"]', "content marketing");
    await page.click('[data-testid="analyze-keyword"]');

    await expect(page.locator('[data-testid="related-keywords"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('[data-testid="keyword-suggestions"]')
    ).toBeVisible();
  });

  test("should export keyword data", async ({ page }) => {
    await page.goto("/keywords");
    await page.fill('[data-testid="keyword-input"]', "SEO tools");
    await page.click('[data-testid="analyze-keyword"]');

    await expect(page.locator('[data-testid="keyword-results"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="export-keywords"]')).toBeVisible();
  });

  test("should handle bulk keyword analysis", async ({ page }) => {
    await page.goto("/keywords/bulk");
    await expect(
      page.locator('[data-testid="bulk-keyword-input"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="upload-keywords"]')).toBeVisible();
  });

  test("should track keyword rankings", async ({ page }) => {
    await page.goto("/keywords/tracking");
    await expect(
      page.locator('[data-testid="keyword-tracking"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="ranking-history"]')).toBeVisible();
  });

  test("should provide search trend analysis", async ({ page }) => {
    await page.goto("/keywords/trends");
    await expect(page.locator('[data-testid="search-trends"]')).toBeVisible();
    await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
  });
});
