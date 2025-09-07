import { test, expect } from "@playwright/test";

// Verifies Enterprise dashboard shows Demo badge when demo content is enabled

test.describe("Enterprise dashboard demo indicators", () => {
  test.setTimeout(90000);

  test("Shows Demo badge with demo content on; shows no-live notice when off", async ({
    page,
  }) => {
    // Warmup
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Demo OFF
    await page.addInitScript(() => {
      window.localStorage.setItem("demoContent", "false");
    });
    await page.goto("/enterprise", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByText("Enterprise Command Center")).toBeVisible();
    await expect(page.getByText("Demo", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("No live enterprise metrics connected", { exact: false })
    ).toBeVisible();

    // Demo ON
    await page.addInitScript(() => {
      window.localStorage.setItem("demoContent", "true");
    });
    await page.goto("/enterprise", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByText("Enterprise Command Center")).toBeVisible();
    await expect(page.getByLabel("Demo data badge")).toBeVisible();
  });
});
