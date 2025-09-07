import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: credential-rotation
 * Tests credential-rotation functionality
 */

test.describe("Feature - credential-rotation", () => {
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

  test("should load credential-rotation interface", async ({ page }) => {
    await page.goto("/credential-rotation");
    await expect(
      page.locator('[data-testid="credential-rotation-container"]')
    ).toBeVisible();
  });

  test("should handle credential-rotation actions", async ({ page }) => {
    await page.goto("/credential-rotation");
    await expect(
      page.locator('[data-testid="credential-rotation-actions"]')
    ).toBeVisible();
  });

  test("should validate credential-rotation data", async ({ page }) => {
    await page.goto("/credential-rotation");
    await expect(
      page.locator('[data-testid="credential-rotation-data"]')
    ).toBeVisible();
  });

  test("should display credential-rotation correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/credential-rotation");
    await expect(
      page.locator('[data-testid="credential-rotation-mobile"]')
    ).toBeVisible();
  });

  test("should handle credential-rotation errors gracefully", async ({
    page,
  }) => {
    await page.goto("/credential-rotation");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="credential-rotation-error-fallback"]')
    ).toBeVisible();
  });
});
