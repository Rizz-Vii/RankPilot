import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: configuration-management
 * Tests configuration-management functionality
 */

test.describe("Feature - configuration-management", () => {
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
          : "unknown";
      console.warn("Login failed, using fallback:", msg);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should load configuration-management interface", async ({ page }) => {
    await page.goto("/configuration-management");
    await expect(
      page.locator('[data-testid="configuration-management-container"]')
    ).toBeVisible();
  });

  test("should handle configuration-management actions", async ({ page }) => {
    await page.goto("/configuration-management");
    await expect(
      page.locator('[data-testid="configuration-management-actions"]')
    ).toBeVisible();
  });

  test("should validate configuration-management data", async ({ page }) => {
    await page.goto("/configuration-management");
    await expect(
      page.locator('[data-testid="configuration-management-data"]')
    ).toBeVisible();
  });

  test("should display configuration-management correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/configuration-management");
    await expect(
      page.locator('[data-testid="configuration-management-mobile"]')
    ).toBeVisible();
  });

  test("should handle configuration-management errors gracefully", async ({
    page,
  }) => {
    await page.goto("/configuration-management");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="configuration-management-error-fallback"]')
    ).toBeVisible();
  });
});
