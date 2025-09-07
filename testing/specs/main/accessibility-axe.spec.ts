import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

test.describe("a11y: axe checks (serious/critical)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // await injectAxe(page); // Removed as per new integration
  });

  test("home has no serious/critical violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(
      seriousOrCritical,
      JSON.stringify(seriousOrCritical, null, 2)
    ).toHaveLength(0);
  });

  test("insights page has no serious/critical violations", async ({ page }) => {
    await page.goto(`${BASE_URL}/insights`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(
      seriousOrCritical,
      JSON.stringify(seriousOrCritical, null, 2)
    ).toHaveLength(0);
  });

  test("dashboard has no serious/critical violations", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(
      seriousOrCritical,
      JSON.stringify(seriousOrCritical, null, 2)
    ).toHaveLength(0);
  });

  test("pricing page has no serious/critical violations", async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(
      seriousOrCritical,
      JSON.stringify(seriousOrCritical, null, 2)
    ).toHaveLength(0);
  });

  test("features page has no serious/critical violations", async ({ page }) => {
    await page.goto(`${BASE_URL}/features`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(
      seriousOrCritical,
      JSON.stringify(seriousOrCritical, null, 2)
    ).toHaveLength(0);
  });

  test("contact page has no serious/critical violations", async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(
      seriousOrCritical,
      JSON.stringify(seriousOrCritical, null, 2)
    ).toHaveLength(0);
  });
});
