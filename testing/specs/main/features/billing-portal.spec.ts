import { expect, test } from "@playwright/test";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * Verify Manage Subscription button appears and triggers portal call (happy path)
 */

test.describe("Billing Portal - Manage Subscription", () => {
  let orchestrator: TestOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    orchestrator = new TestOrchestrator(page);
    page.setDefaultTimeout(20000);
  });

  test("shows Manage Subscription and opens portal URL", async ({ page }) => {
    await orchestrator.userManager.loginAs("agency");

    // Intercept the callable function POST to createPortalSession
    // When using Firebase httpsCallable with emulator, it posts to /functions/projects/.../locations/.../functions:createPortalSession
    let portalCalled = false;
    await page.route(/.*createPortalSession.*/, async (route) => {
      portalCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: { data: { url: "https://portal.stripe.com/session/mock" } },
        }),
      });
    });

    await page.goto("/billing", { waitUntil: "domcontentloaded" });
    await page
      .locator('[data-testid="billing-root"], main, #billing-page')
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});

    // Button may be labeled Manage Subscription (we added it under Payment Method)
    const manageBtn = page.locator('button:has-text("Manage Subscription")');
    await expect(manageBtn).toBeVisible();

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      manageBtn.click(),
    ]);

    expect(portalCalled).toBeTruthy();
    await expect(popup).toHaveURL("https://portal.stripe.com/session/mock");
  });
});
