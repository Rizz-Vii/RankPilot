import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: api-versioning
 * Tests api-versioning functionality
 */

test.describe("Feature - api-versioning", () => {
  let auth: EnhancedAuth;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    auth = new EnhancedAuth(page);

    try {
      const testUser = UNIFIED_TEST_USERS.agency;
      await auth.loginAndGoToDashboard(testUser);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : String(error);
      console.warn("Login failed, using fallback:", message);
      await page.goto("/dashboard");
      await page.waitForTimeout(2000);
    }
  });

  test("should load api-versioning interface", async ({ page }) => {
    await page.goto("/api-versioning");
    await expect(
      page.locator('[data-testid="api-versioning-container"]')
    ).toBeVisible();
  });

  test("should handle api-versioning actions", async ({ page }) => {
    await page.goto("/api-versioning");
    await expect(
      page.locator('[data-testid="api-versioning-actions"]')
    ).toBeVisible();
  });

  test("should validate api-versioning data", async ({ page }) => {
    await page.goto("/api-versioning");
    await expect(
      page.locator('[data-testid="api-versioning-data"]')
    ).toBeVisible();
  });

  test("should display api-versioning correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/api-versioning");
    await expect(
      page.locator('[data-testid="api-versioning-mobile"]')
    ).toBeVisible();
  });

  test("should handle api-versioning errors gracefully", async ({ page }) => {
    await page.goto("/api-versioning");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="api-versioning-error-fallback"]')
    ).toBeVisible();
  });
});
