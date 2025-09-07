/**
 * Security Validation Tests
 * RankPilot - Production Security Testing
 */

import { expect, test } from "@playwright/test";
import { runProductionTests } from "./production-test-suite";

test.describe("Security Validation", () => {
  test("comprehensive security audit", async ({ page }) => {
    const report = await runProductionTests(page, "http://localhost:3000");

    // Validate security results
    const criticalIssues = report.security.filter(
      (r) => r.severity === "critical" && !r.passed
    );
    const highIssues = report.security.filter(
      (r) => r.severity === "high" && !r.passed
    );

    expect(
      criticalIssues.length,
      `Critical security issues found: ${criticalIssues.map((i) => i.test).join(", ")}`
    ).toBe(0);
    expect(
      highIssues.length,
      `High security issues found: ${highIssues.map((i) => i.test).join(", ")}`
    ).toBeLessThanOrEqual(1);

    // Security score should be at least 80%
    const securityScore =
      (report.summary.securityPassed / report.summary.securityTotal) * 100;
    expect(securityScore).toBeGreaterThanOrEqual(80);
  });

  test("CSP headers validation", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() || {};

    expect(headers["content-security-policy"]).toBeDefined();
    expect(headers["x-frame-options"]).toBeDefined();
    expect(headers["x-content-type-options"]).toBeDefined();
  });

  test("authentication protection", async ({ page }) => {
    // Test protected routes redirect to auth
    const protectedRoutes = ["/dashboard", "/neuroseo", "/settings"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      const url = page.url();
      const isRedirectedToAuth =
        url.includes("/signin") ||
        url.includes("/login") ||
        url.includes("/auth");

      expect(
        isRedirectedToAuth,
        `Route ${route} should redirect to authentication`
      ).toBe(true);
    }
  });

  test("XSS protection validation", async ({ page }) => {
    await page.goto("/");

    // Try to inject script in search
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("<script>window.xssTest = true;</script>");
      await page.keyboard.press("Enter");

      // Script should not execute
      // Narrow window to a shape that may contain an xssTest flag without using any
      const xssExecuted = await page.evaluate(() => {
        return (window as unknown as { xssTest?: unknown }).xssTest;
      });
      expect(xssExecuted).toBeUndefined();
    }
  });

  test("HTTPS enforcement", async ({ page, browserName }) => {
    // Skip in development
    if (process.env.NODE_ENV === "development") {
      test.skip();
    }
    await page.goto("/");
    expect(page.url()).toMatch(/^https:/);
  });
});
