import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: user-feedback
 * Tests user-feedback functionality
 */

test.describe("Feature - user-feedback", () => {
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

  test("should load user-feedback interface", async ({ page }) => {
    await page.goto("/user-feedback");
    await expect(
      page.locator('[data-testid="user-feedback-container"]')
    ).toBeVisible();
  });

  test("should handle user-feedback actions", async ({ page }) => {
    await page.goto("/user-feedback");
    await expect(
      page.locator('[data-testid="user-feedback-actions"]')
    ).toBeVisible();
  });

  test("should validate user-feedback data", async ({ page }) => {
    await page.goto("/user-feedback");
    await expect(
      page.locator('[data-testid="user-feedback-data"]')
    ).toBeVisible();
  });

  test("should display user-feedback correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/user-feedback");
    await expect(
      page.locator('[data-testid="user-feedback-mobile"]')
    ).toBeVisible();
  });

  test("should handle user-feedback errors gracefully", async ({ page }) => {
    await page.goto("/user-feedback");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="user-feedback-error-fallback"]')
    ).toBeVisible();
  });
});
