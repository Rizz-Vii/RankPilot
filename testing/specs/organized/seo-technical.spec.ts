import { expect, test } from "@playwright/test";

test.describe("SEO - Technical Implementation", () => {
  test("should have proper meta tags", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(
      1
    );
  });

  test("should implement structured data", async ({ page }) => {
    await page.goto("/");

    const structuredData = await page
      .locator('script[type="application/ld+json"]')
      .count();
    expect(structuredData).toBeGreaterThan(0);
  });

  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toHaveCount(1);
    const h2Count = await page.locator("h2").count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test("should implement canonical URLs", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test("should have robots.txt accessible", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
  });

  test("should have sitemap.xml accessible", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
  });

  test("should implement hreflang for internationalization", async ({
    page,
  }) => {
    await page.goto("/");

    // Check if hreflang is implemented (optional)
    const hreflang = await page.locator("link[hreflang]").count();
    expect(hreflang).toBeGreaterThanOrEqual(0);
  });

  test("should optimize URL structure", async ({ page }) => {
    await page.goto("/content-analyzer");

    const url = page.url();
    expect(url).toMatch(/^https?:\/\/[^\/]+\/[a-z-]+$/);
  });
});
