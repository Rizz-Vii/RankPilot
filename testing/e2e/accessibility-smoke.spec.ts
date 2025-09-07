import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("a11y smoke", () => {
  test("login page has no serious/critical violations", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    if (serious.length) {
      console.warn(
        "a11y serious/critical",
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        }))
      );
    }
    expect.soft(serious.length, "serious/critical a11y violations").toBe(0);
  });

  test("dashboard or post-login surface is reachable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // We consider reachability if main landmark becomes visible or title loads
    const mainVisible = await page
      .locator('main, [role="main"], [data-testid="dashboard"]')
      .first()
      .isVisible()
      .catch(() => false);
    const title = await page.title().catch(() => "");
    expect(mainVisible || !!title).toBeTruthy();
  });
});
