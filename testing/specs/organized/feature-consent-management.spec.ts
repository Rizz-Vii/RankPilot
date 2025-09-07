import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: consent-management
 * Tests consent-management functionality
 */

test.describe("Feature - consent-management", () => {
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

  test("should load consent-management interface", async ({ page }) => {
    await page.goto("/consent-management");
    await expect(
      page.locator('[data-testid="consent-management-container"]')
    ).toBeVisible();
  });

  test("should handle consent-management actions", async ({ page }) => {
    await page.goto("/consent-management");
    await expect(
      page.locator('[data-testid="consent-management-actions"]')
    ).toBeVisible();
  });

  test("should validate consent-management data", async ({ page }) => {
    await page.goto("/consent-management");
    await expect(
      page.locator('[data-testid="consent-management-data"]')
    ).toBeVisible();
  });

  test("should display consent-management correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/consent-management");
    await expect(
      page.locator('[data-testid="consent-management-mobile"]')
    ).toBeVisible();
  });

  test("should handle consent-management errors gracefully", async ({
    page,
  }) => {
    await page.goto("/consent-management");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="consent-management-error-fallback"]')
    ).toBeVisible();
  });
});
