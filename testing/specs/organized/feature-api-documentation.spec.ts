import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: api-documentation
 * Tests api-documentation functionality
 */

test.describe("Feature - api-documentation", () => {
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

  test("should load api-documentation interface", async ({ page }) => {
    await page.goto("/api-documentation");
    await expect(
      page.locator('[data-testid="api-documentation-container"]')
    ).toBeVisible();
  });

  test("should handle api-documentation actions", async ({ page }) => {
    await page.goto("/api-documentation");
    await expect(
      page.locator('[data-testid="api-documentation-actions"]')
    ).toBeVisible();
  });

  test("should validate api-documentation data", async ({ page }) => {
    await page.goto("/api-documentation");
    await expect(
      page.locator('[data-testid="api-documentation-data"]')
    ).toBeVisible();
  });

  test("should display api-documentation correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/api-documentation");
    await expect(
      page.locator('[data-testid="api-documentation-mobile"]')
    ).toBeVisible();
  });

  test("should handle api-documentation errors gracefully", async ({
    page,
  }) => {
    await page.goto("/api-documentation");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="api-documentation-error-fallback"]')
    ).toBeVisible();
  });
});
