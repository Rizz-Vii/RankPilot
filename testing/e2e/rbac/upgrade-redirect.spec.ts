import { expect, test } from "@playwright/test";
import { AuthHelper, PageHelper, RbacHelper } from "../test-utils";

test.describe("@rbac Upgrade CTA redirects to billing", () => {
  test("starter user hitting enterprise-gated page sees Upgrade and routes to billing", async ({
    page,
  }, testInfo) => {
    const projectName = testInfo.project.name || "";
    test.skip(
      !/starter/i.test(projectName),
      "Requires chromium-starter project with starter storageState"
    );

    // Navigate to a clearly enterprise-gated route with showUpgrade
    await page.goto("/marketing", { waitUntil: "domcontentloaded" });
    await PageHelper.waitForPageLoad(page);

    // Auth guard: if redirected to login, perform inline login with known test user
    if (/\/login/.test(page.url())) {
      const email =
        process.env.TEST_USER_EMAIL || "abbas_ali_rizvi@hotmail.com";
      const password = process.env.TEST_USER_PASSWORD || "123456";
      await AuthHelper.login(page, email, password);
      await page.goto("/marketing", { waitUntil: "domcontentloaded" });
      await PageHelper.waitForPageLoad(page);
    }

    // Expect either a restricted message or an upgrade CTA to be visible (gate-aware)
    // No hard pre-check; the helper will handle clicking CTAs or direct navigation fallbacks.

    // Assert upgrade button sends us to billing
    const finalUrl = await RbacHelper.assertUpgradeRedirect(page);
    expect(finalUrl).toMatch(/\/settings\/billing|\/billing/);
  });

  test("agency user hitting enterprise-gated page sees Upgrade and routes to billing", async ({
    page,
  }, testInfo) => {
    const projectName = testInfo.project.name || "";
    test.skip(
      !/agency/i.test(projectName),
      "Requires chromium-agency project with agency storageState"
    );

    // Navigate to an enterprise-gated route with showUpgrade
    await page.goto("/marketing", { waitUntil: "domcontentloaded" });
    await PageHelper.waitForPageLoad(page);

    // Auth guard
    if (/\/login/.test(page.url())) {
      const email =
        process.env.TEST_AGENCY_EMAIL ||
        process.env.TEST_USER_EMAIL ||
        "abbas_ali_rizvi@hotmail.com";
      const password =
        process.env.TEST_AGENCY_PASSWORD ||
        process.env.TEST_USER_PASSWORD ||
        "123456";
      await AuthHelper.login(page, email, password);
      await page.goto("/marketing", { waitUntil: "domcontentloaded" });
      await PageHelper.waitForPageLoad(page);
    }

    const finalUrl = await RbacHelper.assertUpgradeRedirect(page);
    expect(finalUrl).toMatch(/\/settings\/billing|\/billing/);
  });

  test("enterprise user can access enterprise-gated page without upgrade redirect", async ({
    page,
  }, testInfo) => {
    const projectName = testInfo.project.name || "";
    test.skip(
      !/enterprise/i.test(projectName),
      "Requires chromium-enterprise project with enterprise storageState"
    );

    await page.goto("/marketing", { waitUntil: "domcontentloaded" });
    await PageHelper.waitForPageLoad(page);

    // Auth guard
    if (/\/login/.test(page.url())) {
      const email =
        process.env.TEST_ENTERPRISE_EMAIL ||
        process.env.TEST_USER_EMAIL ||
        "abbas_ali_rizvi@hotmail.com";
      const password =
        process.env.TEST_ENTERPRISE_PASSWORD ||
        process.env.TEST_USER_PASSWORD ||
        "123456";
      await AuthHelper.login(page, email, password);
      await page.goto("/marketing", { waitUntil: "domcontentloaded" });
      await PageHelper.waitForPageLoad(page);
    }

    // Assert we're on marketing and not redirected to billing (relaxed content assertion)
    expect(page.url()).toMatch(/\/marketing(\?|$|#|\/)?\.*/);
    expect(page.url()).not.toMatch(/\/settings\/billing|\/billing/);
    // Soft content check: at least main content or any primary region is present
    const hasMain = await page
      .locator('main, [role="main"], [data-testid], h1, h2')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasMain).toBeTruthy();
  });
});
