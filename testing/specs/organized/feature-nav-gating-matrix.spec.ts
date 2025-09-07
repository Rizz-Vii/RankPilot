import { test, expect } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Navigation Gating Matrix
 * Validates representative feature nav items across tiers:
 *  - Starter: Sales & Finance dashboards enabled; Link View, Content Briefs, AI Visibility Engine, Marketing Dashboard disabled
 *  - Agency: Unlocks Link View, Content Briefs, AI Visibility Engine; Marketing Dashboard still disabled
 *  - Enterprise: Unlocks Marketing Dashboard
 */

const selectors = {
  salesDashboard: 'nav a:has-text("Sales Dashboard")',
  financeDashboard: 'nav a:has-text("Finance Dashboard")',
  marketingDashboard: 'nav a:has-text("Marketing Dashboard")',
  linkView: 'nav a:has-text("Link View")',
  contentBriefs: 'nav a:has-text("Content Briefs")',
  aiVisibility: 'nav a:has-text("AI Visibility Engine")',
};

test.describe("Feature Gating · Nav Matrix", () => {
  let auth: EnhancedAuth;
  test.beforeEach(async ({ page }) => {
    auth = new EnhancedAuth(page);
  });

  test("starter tier gating matrix", async ({ page }) => {
    await auth.loginAndGoToDashboard(UNIFIED_TEST_USERS.starter);
    const {
      salesDashboard,
      financeDashboard,
      marketingDashboard,
      linkView,
      contentBriefs,
      aiVisibility,
    } = selectors;
    for (const sel of [
      salesDashboard,
      financeDashboard,
      marketingDashboard,
      linkView,
      contentBriefs,
      aiVisibility,
    ]) {
      await expect(page.locator(sel)).toBeVisible();
    }
    await expect(page.locator(salesDashboard)).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await expect(page.locator(financeDashboard)).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );
    for (const sel of [
      marketingDashboard,
      linkView,
      contentBriefs,
      aiVisibility,
    ]) {
      await expect(page.locator(sel)).toHaveAttribute("aria-disabled", "true");
    }
  });

  test("agency tier gating matrix", async ({ page }) => {
    await auth.loginAndGoToDashboard(UNIFIED_TEST_USERS.agency);
    const { marketingDashboard, linkView, contentBriefs, aiVisibility } =
      selectors;
    for (const sel of [linkView, contentBriefs, aiVisibility]) {
      await expect(page.locator(sel)).not.toHaveAttribute(
        "aria-disabled",
        "true"
      );
    }
    await expect(page.locator(marketingDashboard)).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });

  test("enterprise tier gating matrix", async ({ page }) => {
    await auth.loginAndGoToDashboard(UNIFIED_TEST_USERS.enterprise);
    await expect(
      page.locator(selectors.marketingDashboard)
    ).not.toHaveAttribute("aria-disabled", "true");
  });
});
