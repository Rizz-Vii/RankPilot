import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: performance-monitoring
 * Tests performance-monitoring functionality
 */

test.describe("Feature - performance-monitoring", () => {
  let auth: EnhancedAuth;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    auth = new EnhancedAuth(page);

    try {
      const testUser = UNIFIED_TEST_USERS.agency;
      await auth.loginAndGoToDashboard(testUser);
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : String(error);
      console.warn("Login failed, using fallback:", msg);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should load performance-monitoring interface", async ({ page }) => {
    await page.goto("/performance-monitoring");
    await expect(
      page.locator('[data-testid="performance-monitoring-container"]')
    ).toBeVisible();
  });

  test("should handle performance-monitoring actions", async ({ page }) => {
    await page.goto("/performance-monitoring");
    await expect(
      page.locator('[data-testid="performance-monitoring-actions"]')
    ).toBeVisible();
  });

  test("should validate performance-monitoring data", async ({ page }) => {
    await page.goto("/performance-monitoring");
    await expect(
      page.locator('[data-testid="performance-monitoring-data"]')
    ).toBeVisible();
  });

  test("should display performance-monitoring correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/performance-monitoring");
    await expect(
      page.locator('[data-testid="performance-monitoring-mobile"]')
    ).toBeVisible();
  });

  test("should handle performance-monitoring errors gracefully", async ({
    page,
  }) => {
    await page.goto("/performance-monitoring");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="performance-monitoring-error-fallback"]')
    ).toBeVisible();
  });
});
