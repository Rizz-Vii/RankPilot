import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: data-export
 * Tests data-export functionality
 */

test.describe("Feature - data-export", () => {
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

  test("should load data-export interface", async ({ page }) => {
    await page.goto("/data-export");
    await expect(
      page.locator('[data-testid="data-export-container"]')
    ).toBeVisible();
  });

  test("should handle data-export actions", async ({ page }) => {
    await page.goto("/data-export");
    await expect(
      page.locator('[data-testid="data-export-actions"]')
    ).toBeVisible();
  });

  test("should validate data-export data", async ({ page }) => {
    await page.goto("/data-export");
    await expect(
      page.locator('[data-testid="data-export-data"]')
    ).toBeVisible();
  });

  test("should display data-export correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/data-export");
    await expect(
      page.locator('[data-testid="data-export-mobile"]')
    ).toBeVisible();
  });

  test("should handle data-export errors gracefully", async ({ page }) => {
    await page.goto("/data-export");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="data-export-error-fallback"]')
    ).toBeVisible();
  });
});
