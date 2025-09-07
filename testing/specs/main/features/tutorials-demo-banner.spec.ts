import { test, expect } from "@playwright/test";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * Smoke test: Tutorials and Team pages show the correct demo banner text
 * when demo content is enabled/disabled via localStorage key `demoContent`.
 */

test.describe("Demo banner toggle (tutorials + team)", () => {
  let orchestrator: TestOrchestrator;

  test.beforeEach(async ({ page }) => {
    orchestrator = new TestOrchestrator(page);
    page.setDefaultTimeout(20000);
  });

  test("tutorials page banner toggles with demoContent flag", async ({
    page,
  }) => {
    await orchestrator.userManager.loginAs("free");

    // Demo disabled
    await page.evaluate(() => localStorage.setItem("demoContent", "false"));
    await page.goto("/tutorials", { waitUntil: "domcontentloaded" });
    // Wait for page to hydrate and banner/header to appear
    await page.waitForSelector(
      '[data-testid="tutorials-banner"], [data-testid="tutorials-header"]',
      { timeout: 15000 }
    );
    await expect(page.locator('[data-testid="tutorials-header"]')).toBeVisible({
      timeout: 15000,
    });
    {
      const banner = page.locator('[data-testid="tutorials-banner"]');
      await banner.waitFor({ state: "visible", timeout: 15000 });
      const text = await banner.innerText();
      expect(text).toContain("Tutorials are not available in this environment");
    }

    // Demo enabled
    await page.evaluate(() => localStorage.setItem("demoContent", "true"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .locator('[data-testid="tutorials-banner"]')
      .first()
      .waitFor({ state: "attached", timeout: 30000 });
    await expect(
      page.locator('[data-testid="tutorials-banner"]')
    ).toContainText("Showing curated demo tutorials", { timeout: 30000 });
    // Spot-check a known mock tutorial title exists when demo is enabled
    await expect(
      page.locator("text=Getting Started with RankPilot")
    ).toBeVisible();
  });

  test("team page shows appropriate demo banner text for enterprise tier", async ({
    page,
  }) => {
    await orchestrator.userManager.loginAs("enterprise");

    // Demo enabled -> scaffolding message
    await page.evaluate(() => localStorage.setItem("demoContent", "true"));
    await page.goto("/team", { waitUntil: "domcontentloaded" });
    await page
      .locator('[data-testid="team-banner"]')
      .first()
      .waitFor({ state: "attached", timeout: 30000 });
    await expect(page.locator('[data-testid="team-banner"]')).toContainText(
      "may use demo scaffolding",
      { timeout: 30000 }
    );

    // Demo disabled -> live-only message
    await page.evaluate(() => localStorage.setItem("demoContent", "false"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .locator('[data-testid="team-banner"]')
      .first()
      .waitFor({ state: "attached", timeout: 30000 });
    await expect(page.locator('[data-testid="team-banner"]')).toContainText(
      "Demo content is disabled",
      { timeout: 30000 }
    );
  });
});
