import { expect, test } from "@playwright/test";

test("Site header shows login link when unauthenticated", async ({ page }) => {
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  await page.goto(base);
  // Look for common unauthenticated entry points: login OR register/trial CTA
  const locators = [
    page.locator('a[href*="/login"]'),
    page.locator('a[href*="/signin"]'),
    page.locator('a[href*="/register"]'),
    page.locator('a:has-text("Start 7‑Day Free Trial")'),
    page.locator('text="Login"'),
    page.locator('text="Sign In"'),
  ];
  let found = false;
  for (const l of locators) {
    if ((await l.count()) > 0) {
      found = true;
      break;
    }
  }
  expect(found).toBeTruthy();
});
