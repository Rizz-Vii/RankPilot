import { expect, test } from "@playwright/test";

test.describe("Public Pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("homepage elements and navigation", async ({ page }) => {
    // Use a desktop viewport so primary nav links are visible
    await page.setViewportSize({ width: 1280, height: 800 });
    // Header elements
    await expect(
      page.locator("header").getByRole("link", { name: /RankPilot/i })
    ).toBeVisible();
    await expect(page.locator("header").getByRole("navigation")).toBeVisible();

    // Main navigation links - check for actual links that exist, be more specific
    await expect(
      page
        .locator("header")
        .getByRole("link", { name: "Features", exact: true })
    ).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Pricing" })
    ).toBeVisible();

    // Check for CTA button that leads to registration
    await expect(
      page.getByRole("link", { name: "Start 7‑Day Free Trial" })
    ).toBeVisible();
  });

  test("pricing page content and plans", async ({ page }) => {
    // Pricing is on the homepage, scroll to pricing section
    await page.goto("/#pricing");

    // Check pricing tiers - match actual homepage content
    const pricingTiers = ["Starter", "Agency", "Enterprise"];
    for (const tier of pricingTiers) {
      await expect(page.getByText(tier, { exact: true })).toBeVisible();
    }
  });

  test("features page sections", async ({ page }) => {
    // Navigate directly to avoid flakiness with hidden mobile nav links
    await page.goto("/features");
    await expect(page).toHaveURL(/\/features$/);

    // Check main feature sections - match actual features page content, be more specific
    await expect(
      page.getByRole("heading", { name: "SEO Audit" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Keyword Tool" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Content Analyzer", exact: true })
    ).toBeVisible();
  });

  test("FAQ page content", async ({ page }) => {
    // FAQ is on the homepage, scroll to FAQ section
    await page.goto("/#faq");

    // Check FAQ questions - match actual homepage FAQ content
    await expect(
      page.getByText("Do I need a credit card to start?")
    ).toBeVisible();
    await expect(
      page.getByText("What search surfaces are supported?")
    ).toBeVisible();
    await expect(page.getByText("Can I cancel or downgrade?")).toBeVisible();
  });

  test("responsive design", async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole("button", { name: /menu/i })).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole("navigation")).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByRole("navigation")).toBeVisible();
  });
});
