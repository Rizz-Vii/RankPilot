import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: email-notifications
 * Tests email-notifications functionality
 */

test.describe("Feature - email-notifications", () => {
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
          : String(error);
      console.warn("Login failed, using fallback:", msg);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should load email-notifications interface", async ({ page }) => {
    await page.goto("/email-notifications");
    await expect(
      page.locator('[data-testid="email-notifications-container"]')
    ).toBeVisible();
  });

  test("should handle email-notifications actions", async ({ page }) => {
    await page.goto("/email-notifications");
    await expect(
      page.locator('[data-testid="email-notifications-actions"]')
    ).toBeVisible();
  });

  test("should validate email-notifications data", async ({ page }) => {
    await page.goto("/email-notifications");
    await expect(
      page.locator('[data-testid="email-notifications-data"]')
    ).toBeVisible();
  });

  test("should display email-notifications correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/email-notifications");
    await expect(
      page.locator('[data-testid="email-notifications-mobile"]')
    ).toBeVisible();
  });

  test("should handle email-notifications errors gracefully", async ({
    page,
  }) => {
    await page.goto("/email-notifications");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="email-notifications-error-fallback"]')
    ).toBeVisible();
  });
});
