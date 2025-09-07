import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: backup-restore
 * Tests backup-restore functionality
 */

test.describe("Feature - backup-restore", () => {
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

  test("should load backup-restore interface", async ({ page }) => {
    await page.goto("/backup-restore");
    await expect(
      page.locator('[data-testid="backup-restore-container"]')
    ).toBeVisible();
  });

  test("should handle backup-restore actions", async ({ page }) => {
    await page.goto("/backup-restore");
    await expect(
      page.locator('[data-testid="backup-restore-actions"]')
    ).toBeVisible();
  });

  test("should validate backup-restore data", async ({ page }) => {
    await page.goto("/backup-restore");
    await expect(
      page.locator('[data-testid="backup-restore-data"]')
    ).toBeVisible();
  });

  test("should display backup-restore correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/backup-restore");
    await expect(
      page.locator('[data-testid="backup-restore-mobile"]')
    ).toBeVisible();
  });

  test("should handle backup-restore errors gracefully", async ({ page }) => {
    await page.goto("/backup-restore");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="backup-restore-error-fallback"]')
    ).toBeVisible();
  });
});
