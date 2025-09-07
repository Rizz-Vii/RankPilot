import { expect, test } from "@playwright/test";

const pages = [
  "/",
  "/features",
  "/pricing",
  "/faq",
  "/help",
  "/about",
  "/security",
  "/contact",
  "/case-studies",
];

test.describe("Marketing pages: landmarks & skip link", () => {
  for (const path of pages) {
    test(`landmarks present on ${path}`, async ({ page }) => {
      await page.goto(path);
      // Skip link exists and is focusable
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);
      // Tab to it quickly (some pages render it at top)
      await page.keyboard.press("Tab");
      // main landmark exists
      await expect(page.locator("main#main-content")).toHaveCount(1);
      // header landmark exists (site header)
      await expect(page.locator("header")).toHaveCount(1);
    });
  }
});
