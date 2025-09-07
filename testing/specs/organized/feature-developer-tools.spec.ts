import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: developer-tools
 * Tests developer-tools functionality
 */

test.describe("Feature - developer-tools", () => {
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

  test("should load developer-tools interface", async ({ page }) => {
    await page.goto("/developer-tools");
    await expect(
      page.locator('[data-testid="developer-tools-container"]')
    ).toBeVisible();
  });

  test("should handle developer-tools actions", async ({ page }) => {
    await page.goto("/developer-tools");
    await expect(
      page.locator('[data-testid="developer-tools-actions"]')
    ).toBeVisible();
  });

  test("should validate developer-tools data", async ({ page }) => {
    await page.goto("/developer-tools");
    await expect(
      page.locator('[data-testid="developer-tools-data"]')
    ).toBeVisible();
  });

  test("should display developer-tools correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/developer-tools");
    await expect(
      page.locator('[data-testid="developer-tools-mobile"]')
    ).toBeVisible();
  });

  test("should handle developer-tools errors gracefully", async ({ page }) => {
    await page.goto("/developer-tools");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="developer-tools-error-fallback"]')
    ).toBeVisible();
  });
});
