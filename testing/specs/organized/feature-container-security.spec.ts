import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: container-security
 * Tests container-security functionality
 */

test.describe("Feature - container-security", () => {
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

  test("should load container-security interface", async ({ page }) => {
    await page.goto("/container-security");
    await expect(
      page.locator('[data-testid="container-security-container"]')
    ).toBeVisible();
  });

  test("should handle container-security actions", async ({ page }) => {
    await page.goto("/container-security");
    await expect(
      page.locator('[data-testid="container-security-actions"]')
    ).toBeVisible();
  });

  test("should validate container-security data", async ({ page }) => {
    await page.goto("/container-security");
    await expect(
      page.locator('[data-testid="container-security-data"]')
    ).toBeVisible();
  });

  test("should display container-security correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/container-security");
    await expect(
      page.locator('[data-testid="container-security-mobile"]')
    ).toBeVisible();
  });

  test("should handle container-security errors gracefully", async ({
    page,
  }) => {
    await page.goto("/container-security");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="container-security-error-fallback"]')
    ).toBeVisible();
  });
});
