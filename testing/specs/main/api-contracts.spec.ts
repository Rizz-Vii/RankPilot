import { test, expect } from "@playwright/test";
import { SerpViewPage } from "./pages/serp-view-page";

test.describe("SERP Analysis Network Tests", () => {
  let serpPage: SerpViewPage;

  test.beforeEach(async ({ page }) => {
    serpPage = new SerpViewPage(page);
    await serpPage.navigateTo("/serp-view");
  });

  test("handles API failures gracefully", async ({ page }) => {
    // Intercept API calls and simulate failure
    await page.route("**/api/analyze-serp", async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ _error: "Internal server error" }),
      });
    });

    await serpPage.analyze("https://example.com", "test keyword");

    // Verify error handling UI
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText("Unable to analyze");
  });

  test("shows loading states correctly", async ({ page }) => {
    // Delay API response
    await page.route("**/api/analyze-serp", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          position: 5,
          visibility: 0.75,
          competition: "medium",
        }),
      });
    });

    await serpPage.analyze("https://example.com", "test keyword");

    // Verify loading UI sequence
    await expect(serpPage.loadingSpinner).toBeVisible();
    await expect(serpPage.rankingMetrics).toBeVisible();
    await expect(serpPage.loadingSpinner).toBeHidden();
  });

  test("caches and reuses previous results", async ({ page, context }) => {
    const requestCount = { count: 0 };

    // Count API calls
    await page.route("**/api/analyze-serp", async (route) => {
      requestCount.count++;
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          position: 5,
          visibility: 0.75,
          competition: "medium",
        }),
      });
    });

    // First analysis
    await serpPage.analyze("https://example.com", "test keyword");
    await serpPage.getRankingData();

    // Same analysis again
    await serpPage.analyze("https://example.com", "test keyword");
    await serpPage.getRankingData();

    // Verify only one API call was made
    expect(requestCount.count).toBe(1);
  });
});
