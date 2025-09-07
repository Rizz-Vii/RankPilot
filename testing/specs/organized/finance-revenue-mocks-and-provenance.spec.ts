import { test, expect } from "@playwright/test";

test.describe("Finance Revenue page - mock gating and provenance", () => {
  test.setTimeout(90000);

  test("Provenance legend shows and KPIs reflect mocks when flag toggled", async ({
    page,
  }) => {
    // Warmup
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Mocks OFF
    await page.addInitScript(() => {
      window.localStorage.setItem("allowFinanceMocks", "false");
    });
    await page.goto("/finance/revenue", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByText("Revenue Analytics")).toBeVisible();
    // Without live data, KPI labels like MRR should be minimal/absent
    await page.waitForTimeout(1000);
    const kpiCountOff = await page.getByText("MRR", { exact: false }).count();
    expect(kpiCountOff).toBeLessThanOrEqual(1);

    // Mocks ON
    await page.addInitScript(() => {
      window.localStorage.setItem("allowFinanceMocks", "true");
    });
    await page.goto("/finance/revenue", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByText("Revenue Analytics")).toBeVisible();
    await expect(page.getByText("MRR", { exact: false })).toBeVisible();

    // Provenance legend should be rendered in either case once provenance is set by page effect
    await expect(page.getByText("Provenance Legend")).toBeVisible();
    await expect(page.getByText("Live Data:", { exact: false })).toBeVisible();
    await expect(page.getByText("Demo Data:", { exact: false })).toBeVisible();
  });
});
