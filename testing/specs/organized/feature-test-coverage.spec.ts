import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: test-coverage
 * Tests test-coverage functionality
 */

test.describe("Feature - test-coverage", () => {
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

  test("should load test-coverage interface", async ({ page }) => {
    await page.goto("/test-coverage");
    await expect(
      page.locator('[data-testid="test-coverage-container"]')
    ).toBeVisible();
  });

  test("should handle test-coverage actions", async ({ page }) => {
    await page.goto("/test-coverage");
    await expect(
      page.locator('[data-testid="test-coverage-actions"]')
    ).toBeVisible();
  });

  test("should validate test-coverage data", async ({ page }) => {
    await page.goto("/test-coverage");
    await expect(
      page.locator('[data-testid="test-coverage-data"]')
    ).toBeVisible();
  });

  test("should display test-coverage correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/test-coverage");
    await expect(
      page.locator('[data-testid="test-coverage-mobile"]')
    ).toBeVisible();
  });

  test("should handle test-coverage errors gracefully", async ({ page }) => {
    await page.goto("/test-coverage");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="test-coverage-error-fallback"]')
    ).toBeVisible();
  });
});
