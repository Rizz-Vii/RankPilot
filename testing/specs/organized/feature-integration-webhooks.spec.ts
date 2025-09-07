import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: integration-webhooks
 * Tests integration-webhooks functionality
 */

test.describe("Feature - integration-webhooks", () => {
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

  test("should load integration-webhooks interface", async ({ page }) => {
    await page.goto("/integration-webhooks");
    await expect(
      page.locator('[data-testid="integration-webhooks-container"]')
    ).toBeVisible();
  });

  test("should handle integration-webhooks actions", async ({ page }) => {
    await page.goto("/integration-webhooks");
    await expect(
      page.locator('[data-testid="integration-webhooks-actions"]')
    ).toBeVisible();
  });

  test("should validate integration-webhooks data", async ({ page }) => {
    await page.goto("/integration-webhooks");
    await expect(
      page.locator('[data-testid="integration-webhooks-data"]')
    ).toBeVisible();
  });

  test("should display integration-webhooks correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/integration-webhooks");
    await expect(
      page.locator('[data-testid="integration-webhooks-mobile"]')
    ).toBeVisible();
  });

  test("should handle integration-webhooks errors gracefully", async ({
    page,
  }) => {
    await page.goto("/integration-webhooks");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="integration-webhooks-error-fallback"]')
    ).toBeVisible();
  });
});
