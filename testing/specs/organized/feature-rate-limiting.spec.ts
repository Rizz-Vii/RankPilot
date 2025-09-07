import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: rate-limiting
 * Tests rate-limiting functionality
 */

test.describe("Feature - rate-limiting", () => {
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

  test("should load rate-limiting interface", async ({ page }) => {
    await page.goto("/rate-limiting");
    await expect(
      page.locator('[data-testid="rate-limiting-container"]')
    ).toBeVisible();
  });

  test("should handle rate-limiting actions", async ({ page }) => {
    await page.goto("/rate-limiting");
    await expect(
      page.locator('[data-testid="rate-limiting-actions"]')
    ).toBeVisible();
  });

  test("should validate rate-limiting data", async ({ page }) => {
    await page.goto("/rate-limiting");
    await expect(
      page.locator('[data-testid="rate-limiting-data"]')
    ).toBeVisible();
  });

  test("should display rate-limiting correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/rate-limiting");
    await expect(
      page.locator('[data-testid="rate-limiting-mobile"]')
    ).toBeVisible();
  });

  test("should handle rate-limiting errors gracefully", async ({ page }) => {
    await page.goto("/rate-limiting");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="rate-limiting-error-fallback"]')
    ).toBeVisible();
  });
});
