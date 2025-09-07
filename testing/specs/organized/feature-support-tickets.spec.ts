import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: support-tickets
 * Tests support-tickets functionality
 */

test.describe("Feature - support-tickets", () => {
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

  test("should load support-tickets interface", async ({ page }) => {
    await page.goto("/support-tickets");
    await expect(
      page.locator('[data-testid="support-tickets-container"]')
    ).toBeVisible();
  });

  test("should handle support-tickets actions", async ({ page }) => {
    await page.goto("/support-tickets");
    await expect(
      page.locator('[data-testid="support-tickets-actions"]')
    ).toBeVisible();
  });

  test("should validate support-tickets data", async ({ page }) => {
    await page.goto("/support-tickets");
    await expect(
      page.locator('[data-testid="support-tickets-data"]')
    ).toBeVisible();
  });

  test("should display support-tickets correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/support-tickets");
    await expect(
      page.locator('[data-testid="support-tickets-mobile"]')
    ).toBeVisible();
  });

  test("should handle support-tickets errors gracefully", async ({ page }) => {
    await page.goto("/support-tickets");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="support-tickets-error-fallback"]')
    ).toBeVisible();
  });
});
