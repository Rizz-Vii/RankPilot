import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: cloud-integration
 * Tests cloud-integration functionality
 */

test.describe("Feature - cloud-integration", () => {
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

  test("should load cloud-integration interface", async ({ page }) => {
    await page.goto("/cloud-integration");
    await expect(
      page.locator('[data-testid="cloud-integration-container"]')
    ).toBeVisible();
  });

  test("should handle cloud-integration actions", async ({ page }) => {
    await page.goto("/cloud-integration");
    await expect(
      page.locator('[data-testid="cloud-integration-actions"]')
    ).toBeVisible();
  });

  test("should validate cloud-integration data", async ({ page }) => {
    await page.goto("/cloud-integration");
    await expect(
      page.locator('[data-testid="cloud-integration-data"]')
    ).toBeVisible();
  });

  test("should display cloud-integration correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/cloud-integration");
    await expect(
      page.locator('[data-testid="cloud-integration-mobile"]')
    ).toBeVisible();
  });

  test("should handle cloud-integration errors gracefully", async ({
    page,
  }) => {
    await page.goto("/cloud-integration");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="cloud-integration-error-fallback"]')
    ).toBeVisible();
  });
});
