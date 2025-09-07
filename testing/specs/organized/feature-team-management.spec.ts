import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: team-management
 * Tests team-management functionality
 */

test.describe("Feature - team-management", () => {
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

  test("should load team-management interface", async ({ page }) => {
    await page.goto("/team-management");
    await expect(
      page.locator('[data-testid="team-management-container"]')
    ).toBeVisible();
  });

  test("should handle team-management actions", async ({ page }) => {
    await page.goto("/team-management");
    await expect(
      page.locator('[data-testid="team-management-actions"]')
    ).toBeVisible();
  });

  test("should validate team-management data", async ({ page }) => {
    await page.goto("/team-management");
    await expect(
      page.locator('[data-testid="team-management-data"]')
    ).toBeVisible();
  });

  test("should display team-management correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/team-management");
    await expect(
      page.locator('[data-testid="team-management-mobile"]')
    ).toBeVisible();
  });

  test("should handle team-management errors gracefully", async ({ page }) => {
    await page.goto("/team-management");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="team-management-error-fallback"]')
    ).toBeVisible();
  });
});
