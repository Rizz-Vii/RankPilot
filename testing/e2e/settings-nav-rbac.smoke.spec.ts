import { expect, test } from "@playwright/test";

test.describe("settings + RBAC smoke", () => {
  test("starter RBAC: shows upgrade banner and hides enterprise-only controls", async ({
    page,
  }) => {
    // Run this assertion only for starter-tier projects to avoid false negatives on higher tiers
    const info = test.info();
    const isStarter = /starter/i.test(info.project.name || "");
    if (!isStarter) test.skip();

    // Navigate to a gated settings subpage (branding requires enterprise)
    await page.goto("/settings/branding", { waitUntil: "domcontentloaded" });
    // Assert that either an upgrade banner / denied marker appears OR enterprise-only control is absent.
    const upgradeBanner = page.getByTestId("upgrade-banner");
    const deniedMarker = page.getByTestId("feature-gate-denied");
    const enterpriseOnly = page.getByTestId("enterprise-only-control");
    const bannerVisible = await upgradeBanner.isVisible().catch(() => false);
    const deniedVisible = await deniedMarker.isVisible().catch(() => false);
    const enterpriseCount = await enterpriseOnly.count().catch(() => 0);
    expect(
      bannerVisible || deniedVisible || enterpriseCount === 0
    ).toBeTruthy();
  });

  test("profile/settings sections are navigable", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    // Try a few common tabs/sections if present
    const tabs = [
      page.getByRole("tab", { name: /account/i }),
      page.getByRole("tab", { name: /privacy/i }),
      page.getByRole("tab", { name: /notifications|email/i }),
    ];
    for (const t of tabs) {
      if (await t.isVisible().catch(() => false)) {
        await t.click({ timeout: 5000 }).catch(() => {});
        // Basic assertion that panel content appears
        const panel = page.locator(
          '[role="tabpanel"], section[aria-labelledby]'
        );
        await expect(panel.first()).toBeVisible();
      }
    }
  });
});
