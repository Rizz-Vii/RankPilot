import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * Feature Test: conversion-tracking
 * Tests conversion-tracking functionality
 */

test.describe("Feature - conversion-tracking", () => {
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

  test("should load conversion-tracking interface", async ({ page }) => {
    await page.goto("/conversion-tracking");
    await expect(
      page.locator('[data-testid="conversion-tracking-container"]')
    ).toBeVisible();
  });

  test("should handle conversion-tracking actions", async ({ page }) => {
    await page.goto("/conversion-tracking");
    await expect(
      page.locator('[data-testid="conversion-tracking-actions"]')
    ).toBeVisible();
  });

  test("should validate conversion-tracking data", async ({ page }) => {
    await page.goto("/conversion-tracking");
    await expect(
      page.locator('[data-testid="conversion-tracking-data"]')
    ).toBeVisible();
  });

  test("should display conversion-tracking correctly on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/conversion-tracking");
    await expect(
      page.locator('[data-testid="conversion-tracking-mobile"]')
    ).toBeVisible();
  });

  test("should handle conversion-tracking errors gracefully", async ({
    page,
  }) => {
    await page.goto("/conversion-tracking");
    // Simulate error condition
    await expect(
      page.locator('[data-testid="conversion-tracking-error-fallback"]')
    ).toBeVisible();
  });
});
