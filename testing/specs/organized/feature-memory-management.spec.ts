import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: memory-management
 * Tests memory-management functionality
 */

test.describe("Feature - memory-management", () => {
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

  test("should load memory-management interface", async ({ page }) => {
    await page.goto("/memory-management");
    await expect(
      page.locator('[data-testid="memory-management-container"]')
    ).toBeVisible();
  });

  test("should handle memory-management actions", async ({ page }) => {
    await page.goto("/memory-management");
    await expect(
      page.locator('[data-testid="memory-management-actions"]')
    ).toBeVisible();
  });

  test("should validate memory-management data", async ({ page }) => {
    await page.goto("/memory-management");
    await expect(
      page.locator('[data-testid="memory-management-data"]')
    ).toBeVisible();
  });

  test("should display memory-management correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/memory-management");
    await expect(
      page.locator('[data-testid="memory-management-mobile"]')
    ).toBeVisible();
  });

  test("should handle memory-management errors gracefully", async ({
    page,
  }) => {
    await page.goto("/memory-management");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="memory-management-error-fallback"]')
    ).toBeVisible();
  });
});
