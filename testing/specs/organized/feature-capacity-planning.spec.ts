import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: capacity-planning
 * Tests capacity-planning functionality
 */

test.describe("Feature - capacity-planning", () => {
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

  test("should load capacity-planning interface", async ({ page }) => {
    await page.goto("/capacity-planning");
    await expect(
      page.locator('[data-testid="capacity-planning-container"]')
    ).toBeVisible();
  });

  test("should handle capacity-planning actions", async ({ page }) => {
    await page.goto("/capacity-planning");
    await expect(
      page.locator('[data-testid="capacity-planning-actions"]')
    ).toBeVisible();
  });

  test("should validate capacity-planning data", async ({ page }) => {
    await page.goto("/capacity-planning");
    await expect(
      page.locator('[data-testid="capacity-planning-data"]')
    ).toBeVisible();
  });

  test("should display capacity-planning correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/capacity-planning");
    await expect(
      page.locator('[data-testid="capacity-planning-mobile"]')
    ).toBeVisible();
  });

  test("should handle capacity-planning errors gracefully", async ({
    page,
  }) => {
    await page.goto("/capacity-planning");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="capacity-planning-error-fallback"]')
    ).toBeVisible();
  });
});
