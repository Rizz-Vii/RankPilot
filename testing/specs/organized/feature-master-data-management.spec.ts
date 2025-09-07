import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: master-data-management
 * Tests master-data-management functionality
 */

test.describe("Feature - master-data-management", () => {
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

  test("should load master-data-management interface", async ({ page }) => {
    await page.goto("/master-data-management");
    await expect(
      page.locator('[data-testid="master-data-management-container"]')
    ).toBeVisible();
  });

  test("should handle master-data-management actions", async ({ page }) => {
    await page.goto("/master-data-management");
    await expect(
      page.locator('[data-testid="master-data-management-actions"]')
    ).toBeVisible();
  });

  test("should validate master-data-management data", async ({ page }) => {
    await page.goto("/master-data-management");
    await expect(
      page.locator('[data-testid="master-data-management-data"]')
    ).toBeVisible();
  });

  test("should display master-data-management correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/master-data-management");
    await expect(
      page.locator('[data-testid="master-data-management-mobile"]')
    ).toBeVisible();
  });

  test("should handle master-data-management errors gracefully", async ({
    page,
  }) => {
    await page.goto("/master-data-management");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="master-data-management-error-fallback"]')
    ).toBeVisible();
  });
});
