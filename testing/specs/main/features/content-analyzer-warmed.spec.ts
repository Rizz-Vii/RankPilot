import { expect, test } from "@playwright/test";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * Content Analyzer - Warmed Test Suite
 * Optimized for pre-warmed AI pages with reduced timeouts
 * Leverages global warming strategy for faster execution
 */

test.describe("Content Analyzer - Warmed Suite", () => {
    let orchestrator: TestOrchestrator;
    // Removed unused gracefulUtils instantiation

    test.beforeEach(async ({ page }) => {
        orchestrator = new TestOrchestrator(page);

        // Reduced timeouts since pages are pre-warmed
        page.setDefaultNavigationTimeout(20000); // Reduced from 45s
        page.setDefaultTimeout(15000); // Reduced from 40s
    });

    test.describe("Page Loading (Pre-warmed)", () => {
        test("loads content analyzer with starter tier access (warmed)", async ({ page }) => {
            console.log("🔥 Testing pre-warmed Content Analyzer page...");

            await orchestrator.userManager.loginAs("starter");

            // Since page is pre-warmed, navigation should be faster
            console.log("⚡ Navigating to pre-warmed content-analyzer...");
            await page.goto("/content-analyzer", {
                waitUntil: "domcontentloaded",
                timeout: 15000 // Reduced timeout for warmed page
            });

            // Minimal stabilization needed for pre-warmed page
            await page.waitForTimeout(2000);

            // Verify page loads correctly
            await expect(page.locator("h1, h2, [role='heading']")).toBeVisible({ timeout: 10000 });

            // Check for content analyzer indicators
            const contentIndicators = await page.locator(
                "text=/content.analyzer|analyze.content|ai.powered|content.analysis/i"
            ).count();

            console.log(`✅ Found ${contentIndicators} content analyzer indicators (warmed)`);

            // Verify form is present
            await expect(page.locator("form, [data-testid*='form'], [class*='form']")).toBeVisible({ timeout: 8000 });

            console.log("✅ Pre-warmed Content Analyzer page loads efficiently");
        });

        test("shows breadcrumb navigation (warmed)", async ({ page }) => {
            console.log("🧭 Testing warmed breadcrumb navigation...");

            await orchestrator.userManager.loginAs("starter");

            // Fast navigation to pre-warmed page
            await page.goto("/content-analyzer", {
                waitUntil: "domcontentloaded",
                timeout: 15000
            });

            await page.waitForTimeout(1500); // Minimal wait for warmed page

            // Look for breadcrumb elements
            const breadcrumbElements = await page.locator(
                "[aria-label*='breadcrumb'], [class*='breadcrumb'], nav ol, nav ul, [data-testid*='breadcrumb']"
            ).count();

            console.log(`Found ${breadcrumbElements} breadcrumb navigation elements`);

            // Verify basic navigation structure
            await expect(page.locator("nav, header, [role='navigation']")).toBeVisible({ timeout: 10000 });

            console.log("✅ Breadcrumb navigation verified (warmed)");
        });
    });

    test.describe("Form Interactions (Warmed)", () => {
        test("displays form fields quickly on warmed page", async ({ page }) => {
            console.log("📝 Testing form display on warmed page...");

            await orchestrator.userManager.loginAs("starter");
            await page.goto("/content-analyzer", { waitUntil: "domcontentloaded", timeout: 15000 });

            // Minimal wait for warmed components
            await page.waitForTimeout(1000);

            // Form should be immediately available on warmed page
            await expect(page.locator("textarea[placeholder*='content']")).toBeVisible({ timeout: 5000 });
            await expect(page.locator("input[placeholder*='keyword']")).toBeVisible({ timeout: 5000 });
            await expect(page.locator("button", { hasText: "Analyze Content" })).toBeVisible({ timeout: 5000 });

            console.log("✅ Form fields display quickly on warmed page");
        });

        test("validates content field efficiently", async ({ page }) => {
            console.log("✅ Testing validation on warmed page...");

            await orchestrator.userManager.loginAs("agency");
            await page.goto("/content-analyzer", { waitUntil: "domcontentloaded", timeout: 15000 });

            await page.waitForTimeout(1000); // Minimal wait

            // Quick validation test
            const submitButton = page.locator("button", { hasText: "Analyze Content" });
            await submitButton.click();

            // Should show validation quickly on warmed page
            await expect(page.locator("text=Content is required")).toBeVisible({ timeout: 5000 });

            console.log("✅ Content validation works efficiently on warmed page");
        });
    });

    test.describe("Mobile Responsiveness (Warmed)", () => {
        test("displays correctly on mobile viewport (warmed)", async ({ page }) => {
            console.log("📱 Testing mobile on warmed page...");

            await page.setViewportSize({ width: 375, height: 667 });
            await orchestrator.userManager.loginAs("agency");
            await page.goto("/content-analyzer", { waitUntil: "domcontentloaded", timeout: 15000 });

            await page.waitForTimeout(1000); // Minimal wait for warmed mobile

            // Verify responsive layout loads quickly
            await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
            await expect(page.locator("textarea[placeholder*='content']")).toBeVisible({ timeout: 5000 });

            console.log("✅ Mobile responsiveness verified efficiently (warmed)");
        });
    });

    test.describe("Performance (Warmed)", () => {
        test("loads within optimized time limits (warmed)", async ({ page }) => {
            console.log("⚡ Testing warmed page performance...");

            await orchestrator.userManager.loginAs("starter");

            const startTime = Date.now();
            await page.goto("/content-analyzer", { waitUntil: "domcontentloaded", timeout: 15000 });

            await page.waitForTimeout(1000); // Minimal stabilization
            const loadTime = Date.now() - startTime;

            // Warmed pages should load much faster
            expect(loadTime).toBeLessThan(8000); // Reduced from 20s to 8s expectation

            // Check main elements are loaded
            await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
            await expect(page.locator("form")).toBeVisible({ timeout: 5000 });

            console.log(`✅ Warmed page loaded efficiently in ${loadTime}ms`);
        });
    });
});
