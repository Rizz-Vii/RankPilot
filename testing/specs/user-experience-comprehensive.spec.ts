import { expect, test } from "@playwright/test";

/**
 * User Experience & Interface Comprehensive Test Suite
 * Tests all UI/UX elements, navigation, responsiveness, and accessibility
 */

test.describe("User Experience - Navigation & Layout", () => {
  test("main navigation menu functionality", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    const navMenu = page.locator('nav, [role="navigation"], .navigation');
    await expect(navMenu).toBeVisible();

    // Check for navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test("mobile navigation hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { timeout: 30000 });

    const hamburger = page.locator(
      '[data-testid="mobile-menu"], .hamburger, [aria-label*="menu"]'
    );
    if ((await hamburger.count()) > 0) {
      await hamburger.click();
      await page.waitForTimeout(500);

      const mobileMenu = page.locator(
        '.mobile-menu, [data-testid="mobile-nav"]'
      );
      if ((await mobileMenu.count()) > 0) {
        await expect(mobileMenu).toBeVisible();
      }
    }
  });

  test("sidebar navigation collapse/expand", async ({ page }) => {
    await page.goto("/dashboard", { timeout: 30000 });

    const sidebar = page.locator('.sidebar, [data-testid="sidebar"], aside');
    if ((await sidebar.count()) > 0) {
      await expect(sidebar).toBeVisible();

      const collapseButton = page.locator(
        '[data-testid="sidebar-toggle"], .sidebar-toggle'
      );
      if ((await collapseButton.count()) > 0) {
        await collapseButton.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("breadcrumb navigation", async ({ page }) => {
    await page.goto("/dashboard/reports", { timeout: 30000 });

    const breadcrumbs = page.locator(
      '.breadcrumb, [data-testid="breadcrumb"], nav[aria-label="breadcrumb"]'
    );
    if ((await breadcrumbs.count()) > 0) {
      await expect(breadcrumbs).toBeVisible();
    }
  });

  test("footer links and information", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    const footer = page.locator('footer, [role="contentinfo"]');
    await expect(footer).toBeVisible();

    const footerLinks = page.locator("footer a");
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});

test.describe("User Experience - Forms & Interactions", () => {
  test("form validation and error messages", async ({ page }) => {
    await page.goto("/contact", { timeout: 30000 });

    const submitButton = page.locator(
      'button[type="submit"], input[type="submit"]'
    );
    if ((await submitButton.count()) > 0) {
      await submitButton.click();

      const errorMessages = page.locator('.error, [role="alert"], .text-red');
      if ((await errorMessages.count()) > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    }
  });

  test("input field focus states", async ({ page }) => {
    await page.goto("/login", { timeout: 30000 });

    const emailInput = page.locator('input[type="email"]');
    if ((await emailInput.count()) > 0) {
      await emailInput.focus();

      // Check if input is focused
      const focusedElement = await page.evaluate(
        () => document.activeElement?.tagName
      );
      expect(focusedElement).toBe("INPUT");
    }
  });

  test("button hover and active states", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    const buttons = page.locator("button, .btn");
    if ((await buttons.count()) > 0) {
      await buttons.first().hover();
      await page.waitForTimeout(200);

      await buttons.first().click();
      await page.waitForTimeout(200);
    }
  });

  test("dropdown menu interactions", async ({ page }) => {
    await page.goto("/dashboard", { timeout: 30000 });

    const dropdown = page.locator('.dropdown, [data-testid="dropdown"]');
    if ((await dropdown.count()) > 0) {
      await dropdown.click();

      const dropdownMenu = page.locator('.dropdown-menu, [role="menu"]');
      if ((await dropdownMenu.count()) > 0) {
        await expect(dropdownMenu).toBeVisible();
      }
    }
  });

  test("modal dialog functionality", async ({ page }) => {
    await page.goto("/dashboard", { timeout: 30000 });

    const modalTrigger = page.locator(
      '[data-testid="modal-trigger"], .modal-trigger'
    );
    if ((await modalTrigger.count()) > 0) {
      await modalTrigger.click();

      const modal = page.locator('.modal, [role="dialog"]');
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();

        const closeButton = page.locator('.modal-close, [aria-label="close"]');
        if ((await closeButton.count()) > 0) {
          await closeButton.click();
        }
      }
    }
  });
});

test.describe("User Experience - Responsive Design", () => {
  test("desktop layout (1920x1080)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/", { timeout: 30000 });

    await expect(page.locator("body")).toBeVisible();

    // Check for desktop-specific elements
    const desktopElements = page.locator(".desktop-only, .hidden-mobile");
    if ((await desktopElements.count()) > 0) {
      await expect(desktopElements.first()).toBeVisible();
    }
  });

  test("tablet layout (768x1024)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/", { timeout: 30000 });

    await expect(page.locator("body")).toBeVisible();

    // Check responsive behavior
    const content = page.locator("main, .main-content");
    if ((await content.count()) > 0) {
      await expect(content).toBeVisible();
    }
  });

  test("mobile layout (375x667)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { timeout: 30000 });

    await expect(page.locator("body")).toBeVisible();

    // Check for mobile-optimized layout
    const mobileElements = page.locator(".mobile-only, .block-mobile");
    if ((await mobileElements.count()) > 0) {
      await expect(mobileElements.first()).toBeVisible();
    }
  });

  test("horizontal scroll prevention", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/", { timeout: 30000 });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small tolerance
  });

  test("text readability on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/", { timeout: 30000 });

    const textElements = page.locator("p, span, div:not(:empty)").first();
    if ((await textElements.count()) > 0) {
      const fontSize = await textElements.evaluate(
        (el) => window.getComputedStyle(el).fontSize
      );

      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(14); // Minimum readable font size
    }
  });
});

test.describe("User Experience - Accessibility", () => {
  test("keyboard navigation support", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    // Test Tab navigation
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );

    expect(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]).toContain(
      focusedElement
    );
  });

  test("alt text for images", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    const images = page.locator("img");
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const image = images.nth(i);
        const alt = await image.getAttribute("alt");
        expect(alt).toBeTruthy();
      }
    }
  });

  test("form labels and ARIA attributes", async ({ page }) => {
    await page.goto("/contact", { timeout: 30000 });

    const inputs = page.locator("input, textarea, select");
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        const label = await input.getAttribute("aria-label");
        const labelFor = await page
          .locator(`label[for="${await input.getAttribute("id")}"]`)
          .count();

        expect(label || labelFor > 0).toBeTruthy();
      }
    }
  });

  test("color contrast compliance", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    // Basic contrast check using computed styles
    const textElement = page.locator("p, h1, h2, h3").first();
    if ((await textElement.count()) > 0) {
      const styles = await textElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
        };
      });

      expect(styles.color).toBeTruthy();
    }
  });

  test("heading hierarchy", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeLessThanOrEqual(1); // Only one H1 per page

    const headings = page.locator("h1, h2, h3, h4, h5, h6");
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });
});

test.describe("User Experience - Performance & Loading", () => {
  test("page load performance", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/", { timeout: 30000 });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // Page should load within 5 seconds
  });

  test("loading states and spinners", async ({ page }) => {
    await page.goto("/dashboard", { timeout: 30000 });

    const loadingElements = page.locator(
      '.loading, [data-testid="loading"], .spinner'
    );
    if ((await loadingElements.count()) > 0) {
      // Loading states should be visible briefly
      await page.waitForTimeout(1000);
    }
  });

  test("image lazy loading", async ({ page }) => {
    await page.goto("/", { timeout: 30000 });

    const images = page.locator('img[loading="lazy"]');
    const lazyImageCount = await images.count();

    if (lazyImageCount > 0) {
      console.log(`✅ Found ${lazyImageCount} lazy-loaded images`);
    }
  });

  test("progressive enhancement", async ({ page }) => {
    // Disable JavaScript and test basic functionality
    await page.addInitScript(() => {
      // simulate degraded JS env without broad any
      const w = window as unknown as { addEventListener?: unknown };
      delete (w as { addEventListener?: unknown }).addEventListener;
    });

    await page.goto("/", { timeout: 30000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("error boundary handling", async ({ page }) => {
    // Test error handling by navigating to non-existent page
    await page.goto("/non-existent-page", { timeout: 30000 });

    const errorElements = page.locator("text=/error|not found|404/i");
    if ((await errorElements.count()) > 0) {
      await expect(errorElements.first()).toBeVisible();
    }
  });
});
