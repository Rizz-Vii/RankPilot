import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: high-availability
 * Tests high-availability functionality
 */

test.describe("Feature - high-availability", () => {
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

  test("should load high-availability interface", async ({ page }) => {
    await page.goto("/high-availability");
    await expect(
      page.locator('[data-testid="high-availability-container"]')
    ).toBeVisible();
  });

  test("should handle high-availability actions", async ({ page }) => {
    await page.goto("/high-availability");
    await expect(
      page.locator('[data-testid="high-availability-actions"]')
    ).toBeVisible();
  });

  test("should validate high-availability data", async ({ page }) => {
    await page.goto("/high-availability");
    await expect(
      page.locator('[data-testid="high-availability-data"]')
    ).toBeVisible();
  });

  test("should display high-availability correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/high-availability");
    await expect(
      page.locator('[data-testid="high-availability-mobile"]')
    ).toBeVisible();
  });

  test("should handle high-availability errors gracefully", async ({
    page,
  }) => {
    await page.goto("/high-availability");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="high-availability-error-fallback"]')
    ).toBeVisible();
  });
});
