import { test, expect } from "@playwright/test";

// Contract: Finance dashboard should display mock banner when API fails and mocks allowed.
// Setting localStorage.allowFinanceMocks = 'false' removes banner (disables mock fallback).

import type { Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", "admin@rankpilot.com");
  await page.fill("#password", "admin123");
  await page.press("#password", "Enter");
  await page
    .waitForURL(/dashboard|app|finance/, { timeout: 20000 })
    .catch(() => {});
}

test.describe("Finance Mock Gating", () => {
  test("mock banner visible under mock fallback then hidden after override", async ({
    page,
  }) => {
    if (test.info().project.name !== "chromium") test.skip();
    await login(page);
    await page.goto("/finance");
    await expect(
      page.getByRole("heading", { name: "Finance Dashboard" })
    ).toBeVisible();

    // Wait for either banner or some KPI cell; then assert banner appears when mocks allowed and no live KPIs.
    const banner = page.getByLabel("Finance mock data banner");
    await Promise.race([
      banner.waitFor({ state: "visible", timeout: 7000 }),
      page
        .waitForSelector('[aria-label="Loading metric"]', {
          state: "detached",
          timeout: 7000,
        })
        .catch(() => {}),
    ]).catch(() => {});

    // If KPIs loaded live (unlikely with empty invoices) banner may not show; ensure banner existence then proceed.
    const bannerCount = await banner.count();
    expect(bannerCount).toBeGreaterThan(0);

    // Disable mocks and reload -> banner should disappear.
    await page.evaluate(() => {
      localStorage.setItem("allowFinanceMocks", "false");
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Finance Dashboard" })
    ).toBeVisible();
    await expect(page.getByLabel("Finance mock data banner")).toHaveCount(0);
  });
});
