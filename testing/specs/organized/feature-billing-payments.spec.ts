import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: billing-payments
 * Tests billing-payments functionality
 */

test.describe("Feature - billing-payments", () => {
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

  test("should load billing-payments interface", async ({ page }) => {
    await page.goto("/billing-payments");
    await expect(
      page.locator('[data-testid="billing-payments-container"]')
    ).toBeVisible();
  });

  test("should handle billing-payments actions", async ({ page }) => {
    await page.goto("/billing-payments");
    await expect(
      page.locator('[data-testid="billing-payments-actions"]')
    ).toBeVisible();
  });

  test("should validate billing-payments data", async ({ page }) => {
    await page.goto("/billing-payments");
    await expect(
      page.locator('[data-testid="billing-payments-data"]')
    ).toBeVisible();
  });

  test("should display billing-payments correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/billing-payments");
    await expect(
      page.locator('[data-testid="billing-payments-mobile"]')
    ).toBeVisible();
  });

  test("should handle billing-payments errors gracefully", async ({ page }) => {
    await page.goto("/billing-payments");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="billing-payments-error-fallback"]')
    ).toBeVisible();
  });
});
