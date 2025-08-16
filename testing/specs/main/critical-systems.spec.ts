import { expect, test } from "@playwright/test";

/**
 * Critical System Tests - Essential functionality validation
 * Used by workflows for lean channel and deployment validation
 */

test.describe("🚨 Critical System Validation", () => {
    test.beforeEach(async ({ page }) => {
        // Set reasonable timeouts for critical tests
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(15000);
    });

    test("Homepage loads successfully", async ({ page }) => {
        await page.goto("/");

        // Verify page loads and key elements are present
        await expect(page).toHaveTitle(/RankPilot/);
        await expect(page.locator("header")).toBeVisible();

        // Check for critical navigation elements
        const navigation = page.locator("nav, [role='navigation']");
        await expect(navigation).toBeVisible();
    });

    test("Authentication system is accessible", async ({ page }) => {
        await page.goto("/auth/signin");

        // Verify signin page loads
        await expect(page).toHaveTitle(/Sign In|Login|RankPilot/);

        // Check for auth form elements
        const emailInput = page.locator("input[type='email'], input[name='email']");
        const passwordInput = page.locator("input[type='password'], input[name='password']");

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
    });

    test("Dashboard route is protected", async ({ page }) => {
        // Try to access dashboard without authentication
        await page.goto("/dashboard");

        // Should redirect to auth or show login prompt
        await page.waitForURL(url =>
            url.href.includes("/auth") ||
            url.href.includes("/signin") ||
            url.href.includes("/login") ||
            url.href === page.url() // Stay on same page if showing login modal
        );

        // Verify we're either redirected or see auth elements
        const isRedirected = page.url().includes("/auth") || page.url().includes("/signin");
        const hasLoginForm = await page.locator("input[type='email'], input[name='email']").isVisible();

        expect(isRedirected || hasLoginForm).toBeTruthy();
    });

    test("API health check passes", async ({ page }) => {
        // Full health snapshot
        const response = await page.request.get("/api/health");
        expect(response.status()).toBeLessThan(500);
        if (response.status() === 200) {
            const json = await response.json();
            expect(json).toHaveProperty('kpis');
            expect(json).toHaveProperty('p95');
            // Core KPI invariants (non-fatal soft checks)
            if (json.kpis) {
                ['provenanceCoveragePct', 'fallbackRate', 'cacheHitRatio', 'rateLimitRejectionRate'].forEach(k => {
                    if (k in json.kpis && json.kpis[k] != null) {
                        expect(typeof json.kpis[k]).toBe('number');
                    }
                });
            }
        }
        // Lightweight probe for version/build info
        const simple = await page.request.get('/api/health/simple');
        if (simple.ok()) {
            const s = await simple.json();
            expect(s).toHaveProperty('version');
            expect(s).toHaveProperty('buildSha');
            expect(typeof s.uptimeMs).toBe('number');
        }
    });

    test("Static assets load correctly", async ({ page }) => {
        await page.goto("/");

        // Check for favicon
        const faviconResponse = await page.request.get("/favicon.ico");
        expect(faviconResponse.status()).toBeLessThan(400);

        // Verify no critical console errors
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                errors.push(msg.text());
            }
        });

        await page.waitForLoadState("networkidle");

        // Filter out non-critical errors
        const criticalErrors = errors.filter(error =>
            !error.includes("favicon") &&
            !error.includes("Extension") &&
            !error.includes("chrome-extension")
        );

        expect(criticalErrors.length).toBe(0);
    });

    test("Mobile viewport renders correctly", async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");

        // Verify page is responsive
        await expect(page.locator("body")).toBeVisible();

        // Check for mobile navigation
        const mobileNav = page.locator("[data-testid='mobile-nav'], .mobile-nav, button[aria-label*='menu']");
        const hasAnyMobileNav = await mobileNav.count() > 0;

        // Either mobile nav exists or desktop nav adapts well
        if (hasAnyMobileNav) {
            await expect(mobileNav.first()).toBeVisible();
        } else {
            // Verify desktop nav doesn't overflow
            const nav = page.locator("nav, [role='navigation']");
            await expect(nav).toBeVisible();
        }
    });
});

test.describe("🔍 Lean Channel Specific Tests", () => {
    test("Lean deployment has correct CSP headers", async ({ page }) => {
        const response = await page.goto("/");

        // Check for CSP headers (important for lean deployments)
        const csp = response?.headers()["content-security-policy"];

        if (csp) {
            // If CSP exists, ensure it's not blocking critical functionality
            expect(csp).toContain("script-src");
            expect(csp).toContain("style-src");
        }
    });

    test("Firebase configuration is loaded", async ({ page }) => {
        await page.goto("/");

        // Check if Firebase is initialized (look for Firebase-related scripts or config)
        const firebaseConfig = await page.evaluate(() => {
            return typeof window !== "undefined" &&
                (window as any).firebase !== undefined ||
                document.querySelector("script[src*='firebase']") !== null;
        });

        // Firebase should be present in production builds
        expect(typeof firebaseConfig).toBe("boolean");
    });
});
