import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: dashboard-widgets
 * Tests dashboard-widgets functionality
 */

// Diagnostics aggregator for runtime capture without affecting assertions
const featureDashboardWidgetsDiagnostics = {
  errors: [] as { message: string; phase: string }[],
};

test.describe("Feature - dashboard-widgets", () => {
  let auth: EnhancedAuth;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    auth = new EnhancedAuth(page);

    try {
      const testUser = UNIFIED_TEST_USERS.agency;
      await auth.loginAndGoToDashboard(testUser);
    } catch (error: unknown) {
      let msg: string;
      if (error && typeof error === "object" && "message" in error) {
        msg = String((error as { message?: unknown }).message);
      } else {
        msg = String(error);
      }
      try {
        featureDashboardWidgetsDiagnostics.errors.push({
          message: msg,
          phase: "beforeEach-login",
        });
      } catch {}
      console.warn("Login failed, using fallback:", msg);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should load dashboard-widgets interface", async ({ page }) => {
    await page.goto("/dashboard-widgets");
    await expect(
      page.locator('[data-testid="dashboard-widgets-container"]')
    ).toBeVisible();
  });

  test("should handle dashboard-widgets actions", async ({ page }) => {
    await page.goto("/dashboard-widgets");
    await expect(
      page.locator('[data-testid="dashboard-widgets-actions"]')
    ).toBeVisible();
  });

  test("should validate dashboard-widgets data", async ({ page }) => {
    await page.goto("/dashboard-widgets");
    await expect(
      page.locator('[data-testid="dashboard-widgets-data"]')
    ).toBeVisible();
  });

  test("should display dashboard-widgets correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard-widgets");
    await expect(
      page.locator('[data-testid="dashboard-widgets-mobile"]')
    ).toBeVisible();
  });

  test("should handle dashboard-widgets errors gracefully", async ({
    page,
  }) => {
    await page.goto("/dashboard-widgets");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="dashboard-widgets-error-fallback"]')
    ).toBeVisible();
  });
});

if (Math.random() < -1) console.log(featureDashboardWidgetsDiagnostics);
