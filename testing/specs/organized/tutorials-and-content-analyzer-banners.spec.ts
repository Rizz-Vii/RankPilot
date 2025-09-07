import { test, expect } from "@playwright/test";

// Small checks for tutorials and content analyzer banners with demo flag on/off
// Uses localStorage override (demo.ts supports window.localStorage['demoContent'])

test.describe("Demo banners and behavior", () => {
  test("Tutorials banner toggles with demo flag", async ({ page }) => {
    // Off
    await page.addInitScript(() => {
      window.localStorage.setItem("demoContent", "false");
    });
    await page.goto("/tutorials");
    await expect(page.getByTestId("tutorials-page")).toBeVisible();
    const banner = page.getByTestId("tutorials-banner");
    await expect(banner).toContainText("not available");

    // On
    await page.addInitScript(() => {
      window.localStorage.setItem("demoContent", "true");
    });
    await page.reload();
    await expect(banner).toContainText("curated demo tutorials");
  });

  test("Content Analyzer blocks mock report when demo disabled", async ({
    page,
  }) => {
    // Force off
    await page.addInitScript(() => {
      window.localStorage.setItem("demoContent", "false");
    });
    await page.goto("/content-analyzer");

    // Fill minimal form
    await page.getByLabel("Website URL *").fill("https://example.com");
    await page
      .getByRole("button", { name: "Start NeuroSEO™ Analysis" })
      .click();

    // Expect error notice due to demo disabled (from allowContentAnalyzerMocks gating)
    await expect(
      page.getByText("Live NeuroSEO analysis is not yet available")
    ).toBeVisible();

    // Turn on demo and retry quickly
    await page.addInitScript(() => {
      window.localStorage.setItem("demoContent", "true");
    });
    await page.reload();
    await page.getByLabel("Website URL *").fill("https://example.com");
    await page
      .getByRole("button", { name: "Start NeuroSEO™ Analysis" })
      .click();

    // After mock completes, we should see some results sections headings
    await expect(page.getByText("Key Insights", { exact: false })).toBeVisible({
      timeout: 15000,
    });
  });
});
