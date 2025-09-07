import { expect, test } from "@playwright/test";

/**
 * Visual Regression Test Suite
 * Consolidated from multiple visual testing files for better organization
 */

test.describe("Visual Regression Tests", () => {
  test.describe("Dashboard Visual Tests", () => {
    test("dashboard renders correctly", async ({ page }) => {
      console.log("📸 Testing dashboard visual appearance...");

      // Navigate to dashboard (unauthenticated - should redirect to login)
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Wait briefly for dynamic elements to settle
      await page.waitForTimeout(1500);

      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot("dashboard-redirect.png", {
        fullPage: true,
        animations: "disabled",
      });

      console.log("✅ Dashboard visual test completed");
    });

    test("login page visual consistency", async ({ page }) => {
      console.log("📸 Testing login page visual appearance...");

      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Hide dynamic elements that might cause flakiness
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"],
          .loading-spinner,
          .animate-pulse {
            visibility: hidden !important;
          }
        `,
      });

      await expect(page).toHaveScreenshot("login-page.png", {
        fullPage: true,
        animations: "disabled",
      });

      console.log("✅ Login page visual test completed");
    });
  });

  test.describe("Mobile Visual Tests", () => {
    test("mobile dashboard layout", async ({ page }) => {
      console.log("📱 Testing mobile dashboard layout...");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Hide dynamic elements
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"],
          .loading-spinner,
          .animate-pulse {
            visibility: hidden !important;
          }
        `,
      });

      await expect(page).toHaveScreenshot("mobile-homepage.png", {
        fullPage: true,
        animations: "disabled",
      });

      console.log("✅ Mobile visual test completed");
    });
  });

  test.describe("Component Visual Tests", () => {
    test("navigation components render correctly", async ({ page }) => {
      console.log("🧭 Testing navigation component visuals...");

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Test desktop navigation
      await page.setViewportSize({ width: 1280, height: 720 });

      const navigation = page.locator("nav").first();
      await expect(navigation).toHaveScreenshot("desktop-navigation.png", {
        animations: "disabled",
      });

      // Test mobile navigation
      await page.setViewportSize({ width: 375, height: 667 });

      const mobileNav = page
        .locator('[data-testid="mobile-menu"]')
        .or(page.locator('button[aria-label*="menu"]'))
        .first();

      if (await mobileNav.isVisible()) {
        await expect(mobileNav).toHaveScreenshot(
          "mobile-navigation-button.png",
          {
            animations: "disabled",
          }
        );
      }

      console.log("✅ Navigation visual tests completed");
    });
  });

  test.describe("Cross-Browser Visual Consistency", () => {
    test("consistent rendering across viewport sizes", async ({ page }) => {
      console.log("📐 Testing cross-viewport visual consistency...");

      const viewports = [
        { width: 1920, height: 1080, name: "desktop-large" },
        { width: 1280, height: 720, name: "desktop-standard" },
        { width: 768, height: 1024, name: "tablet" },
        { width: 375, height: 667, name: "mobile" },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);

        // Hide dynamic elements
        await page.addStyleTag({
          content: `
            [data-testid="timestamp"],
            .loading-spinner,
            .animate-pulse {
              visibility: hidden !important;
            }
          `,
        });

        await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
          fullPage: false, // Viewport only for consistency
          animations: "disabled",
        });

        console.log(
          `✅ ${viewport.name} (${viewport.width}x${viewport.height}) visual test completed`
        );
      }
    });
  });

  test.describe("Error State Visuals", () => {
    test("404 page visual appearance", async ({ page }) => {
      console.log("❌ Testing 404 page visuals...");

      await page.goto("/non-existent-page", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      await expect(page).toHaveScreenshot("404-page.png", {
        fullPage: true,
        animations: "disabled",
      });

      console.log("✅ 404 page visual test completed");
    });
  });
});
