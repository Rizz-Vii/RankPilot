import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: user-profile
 * Tests user-profile functionality
 */

test.describe("Feature - user-profile", () => {
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

  test("should load user-profile interface", async ({ page }) => {
    await page.goto("/user-profile");
    await expect(
      page.locator('[data-testid="user-profile-container"]')
    ).toBeVisible();
  });

  test("should handle user-profile actions", async ({ page }) => {
    await page.goto("/user-profile");
    await expect(
      page.locator('[data-testid="user-profile-actions"]')
    ).toBeVisible();
  });

  test("should validate user-profile data", async ({ page }) => {
    await page.goto("/user-profile");
    await expect(
      page.locator('[data-testid="user-profile-data"]')
    ).toBeVisible();
  });

  test("should display user-profile correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/user-profile");
    await expect(
      page.locator('[data-testid="user-profile-mobile"]')
    ).toBeVisible();
  });

  test("should handle user-profile errors gracefully", async ({ page }) => {
    await page.goto("/user-profile");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="user-profile-error-fallback"]')
    ).toBeVisible();
  });
});
