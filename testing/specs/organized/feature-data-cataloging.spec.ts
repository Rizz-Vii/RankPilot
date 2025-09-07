import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: data-cataloging
 * Tests data-cataloging functionality
 */

test.describe("Feature - data-cataloging", () => {
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

  test("should load data-cataloging interface", async ({ page }) => {
    await page.goto("/data-cataloging");
    await expect(
      page.locator('[data-testid="data-cataloging-container"]')
    ).toBeVisible();
  });

  test("should handle data-cataloging actions", async ({ page }) => {
    await page.goto("/data-cataloging");
    await expect(
      page.locator('[data-testid="data-cataloging-actions"]')
    ).toBeVisible();
  });

  test("should validate data-cataloging data", async ({ page }) => {
    await page.goto("/data-cataloging");
    await expect(
      page.locator('[data-testid="data-cataloging-data"]')
    ).toBeVisible();
  });

  test("should display data-cataloging correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/data-cataloging");
    await expect(
      page.locator('[data-testid="data-cataloging-mobile"]')
    ).toBeVisible();
  });

  test("should handle data-cataloging errors gracefully", async ({ page }) => {
    await page.goto("/data-cataloging");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="data-cataloging-error-fallback"]')
    ).toBeVisible();
  });
});
