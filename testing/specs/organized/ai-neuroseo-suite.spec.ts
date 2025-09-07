import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * AI Integration - NeuroSEO™ Suite Tests
 * Tests core NeuroSEO™ Suite functionality
 */

test.describe("AI Integration - NeuroSEO™ Suite", () => {
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
          ? String((error as { message?: unknown }).message)
          : String(error);
      console.warn("Login failed, using fallback:", msg);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should access NeuroSEO™ Dashboard", async ({ page }) => {
    await page.goto("/neuroseo");
    await expect(page.locator("h1")).toContainText([
      "NeuroSEO",
      "AI",
      "Dashboard",
    ]);
    await expect(
      page.locator('[data-testid="neuroseo-dashboard"]')
    ).toBeVisible();
  });

  test("should display 6 AI engines", async ({ page }) => {
    await page.goto("/neuroseo");

    // Check for all 6 engines
    const engines = [
      "NeuralCrawler™",
      "SemanticMap™",
      "AI Visibility Engine",
      "TrustBlock™",
      "RewriteGen™",
      "Orchestrator",
    ];

    for (const engine of engines) {
      await expect(page.locator(`text=${engine}`)).toBeVisible();
    }
  });

  test("should run comprehensive SEO analysis", async ({ page }) => {
    await page.goto("/neuroseo");

    // Input URL for analysis
    await page.fill('[data-testid="url-input"]', "https://example.com");
    await page.fill('[data-testid="keywords-input"]', "seo, optimization");

    // Start analysis
    await page.click('[data-testid="start-analysis"]');

    // Wait for results
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="analysis-score"]')).toContainText(
      /\d+/
    );
  });

  test("should display competitive analysis", async ({ page }) => {
    await page.goto("/neuroseo/competitive");
    await expect(page.locator("h1")).toContainText("Competitive");
    await expect(
      page.locator('[data-testid="competitor-analysis"]')
    ).toBeVisible();
  });

  test("should show AI visibility metrics", async ({ page }) => {
    await page.goto("/neuroseo/ai-visibility");
    await expect(
      page.locator('[data-testid="ai-visibility-metrics"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="citation-tracking"]')
    ).toBeVisible();
  });

  test("should validate subscription tier access", async ({ page }) => {
    // Test that agency tier can access advanced features
    await page.goto("/neuroseo/advanced");
    await expect(
      page.locator('[data-testid="advanced-features"]')
    ).toBeVisible();
  });

  test("should handle quota management", async ({ page }) => {
    await page.goto("/neuroseo");
    await expect(page.locator('[data-testid="quota-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-meter"]')).toBeVisible();
  });
});
