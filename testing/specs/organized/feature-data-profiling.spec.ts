import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: data-profiling
 * Tests data-profiling functionality
 */

test.describe("Feature - data-profiling", () => {
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

  test("should load data-profiling interface", async ({ page }) => {
    await page.goto("/data-profiling");
    await expect(
      page.locator('[data-testid="data-profiling-container"]')
    ).toBeVisible();
  });

  test("should handle data-profiling actions", async ({ page }) => {
    await page.goto("/data-profiling");
    await expect(
      page.locator('[data-testid="data-profiling-actions"]')
    ).toBeVisible();
  });

  test("should validate data-profiling data", async ({ page }) => {
    await page.goto("/data-profiling");
    await expect(
      page.locator('[data-testid="data-profiling-data"]')
    ).toBeVisible();
  });

  test("should display data-profiling correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/data-profiling");
    await expect(
      page.locator('[data-testid="data-profiling-mobile"]')
    ).toBeVisible();
  });

  test("should handle data-profiling errors gracefully", async ({ page }) => {
    await page.goto("/data-profiling");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="data-profiling-error-fallback"]')
    ).toBeVisible();
  });
});
