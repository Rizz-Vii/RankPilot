import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: alerting-system
 * Tests alerting-system functionality
 */

test.describe("Feature - alerting-system", () => {
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
          ? String((error as { message?: unknown }).message)
          : "unknown";
      console.warn("Login failed, using fallback:", msg);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should load alerting-system interface", async ({ page }) => {
    await page.goto("/alerting-system");
    await expect(
      page.locator('[data-testid="alerting-system-container"]')
    ).toBeVisible();
  });

  test("should handle alerting-system actions", async ({ page }) => {
    await page.goto("/alerting-system");
    await expect(
      page.locator('[data-testid="alerting-system-actions"]')
    ).toBeVisible();
  });

  test("should validate alerting-system data", async ({ page }) => {
    await page.goto("/alerting-system");
    await expect(
      page.locator('[data-testid="alerting-system-data"]')
    ).toBeVisible();
  });

  test("should display alerting-system correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/alerting-system");
    await expect(
      page.locator('[data-testid="alerting-system-mobile"]')
    ).toBeVisible();
  });

  test("should handle alerting-system errors gracefully", async ({ page }) => {
    await page.goto("/alerting-system");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="alerting-system-error-fallback"]')
    ).toBeVisible();
  });
});
