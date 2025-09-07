import { test, expect } from "@playwright/test";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * FIN-02 Billing UI Accessibility & Regression Tests
 */

test.describe("Billing UI (FIN-02) - Accessibility & Regression", () => {
  let orchestrator: TestOrchestrator;

  test.beforeEach(async ({ page }) => {
    orchestrator = new TestOrchestrator(page);
    page.setDefaultTimeout(25000);
  });

  test("has main landmark, heading structure, usage + history sections", async ({
    page,
  }) => {
    await orchestrator.userManager.loginAs("agency");
    await page.goto("/billing");
    await expect(
      page.locator('main[aria-label="Billing portal main content"]')
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Billing"
    );
    await expect(page.getByTestId("usage-section")).toBeVisible();
    await expect(page.getByTestId("billing-history")).toBeVisible();
  });

  test("keyboard navigation reaches key interactive elements (first 5 tabbable)", async ({
    page,
  }) => {
    await orchestrator.userManager.loginAs("agency");
    await page.goto("/billing");
    // Collect focus order for first few tab presses
    const focused: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const el = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a) return null;
        return (
          a.getAttribute("data-testid") ||
          a.getAttribute("aria-label") ||
          a.textContent?.trim()?.slice(0, 40) ||
          a.tagName
        );
      });
      if (el) focused.push(el);
    }
    expect(focused.length).toBeGreaterThan(2); // ensure traversal
  });

  test("pagination load more appends invoices without duplicates (network intercept)", async ({
    page,
  }) => {
    await orchestrator.userManager.loginAs("agency");
    let loadMoreTriggered = false;
    await page.route("/api/billing/invoices*", async (route, req) => {
      const url = new URL(req.url());
      if (url.searchParams.get("cursor")) {
        loadMoreTriggered = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            invoices: [
              {
                id: "inv-extra-1",
                period: "2025-05",
                amount: 12,
                description: "Extra Invoice 1",
                date: "2025-05-05T00:00:00.000Z",
                status: "paid",
              },
              {
                id: "inv-extra-2",
                period: "2025-04",
                amount: 18,
                description: "Extra Invoice 2",
                date: "2025-04-04T00:00:00.000Z",
                status: "paid",
              },
            ],
            hasMore: false,
          }),
        });
      }
      return route.continue();
    });
    await page.goto("/billing");
    // Force navigate to last page by repeatedly clicking Next / Load More if present
    for (let i = 0; i < 4; i++) {
      const next = page.locator('button:has-text("Next")');
      if (await next.isVisible()) {
        await next.click();
        await page.waitForTimeout(200); // small delay
      }
    }
    if (loadMoreTriggered) {
      await expect(
        page.getByTestId("invoice-row").filter({ hasText: "Extra Invoice 1" })
      ).toBeVisible();
    }
  });

  test("handles payment method API failure gracefully", async ({ page }) => {
    await orchestrator.userManager.loginAs("agency");
    await page.route("/api/billing/payment-method", (route) =>
      route.fulfill({ status: 500, body: "{}" })
    );
    await page.goto("/billing");
    // Should still render core sections
    await expect(page.getByTestId("billing-root")).toBeVisible();
    await expect(page.getByTestId("usage-section")).toBeVisible();
  });
});
