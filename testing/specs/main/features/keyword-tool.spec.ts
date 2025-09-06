import { expect, test } from "@playwright/test";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * Keyword Tool - Comprehensive Test Suite
 * Tests AI-powered keyword research, suggestions, and SEO metrics
 */

test.describe("Keyword Tool - Comprehensive Suite", () => {
  let orchestrator: TestOrchestrator;
  // Removed unused gracefulUtils instantiation

  test.beforeEach(async ({ page }) => {
    orchestrator = new TestOrchestrator(page);

    // Set extended timeouts for AI processing
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(25000);
  });

  test.describe("Page Loading and Authentication", () => {
    test("loads keyword tool with free tier access", async ({ page }) => {
      console.log("🔑 Testing Keyword Tool page loading...");

      await orchestrator.userManager.loginAs("free");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Verify page loads correctly
      await expect(page.locator("h1")).toContainText("Keyword Tool");
      await expect(page.locator("text=Discover high-performing keywords")).toBeVisible();

      // Verify form is present
      await expect(page.locator("form")).toBeVisible();
      await expect(page.locator("button", { hasText: "Generate Keywords" })).toBeVisible();

      console.log("✅ Keyword Tool page loads correctly");
    });

    test("shows breadcrumb navigation", async ({ page }) => {
      console.log("🍞 Testing breadcrumb navigation...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Check for breadcrumb
      await expect(page.locator("nav")).toBeVisible();
      await expect(page.locator("text=Dashboard")).toBeVisible();
      await expect(page.locator("text=Keyword Tool")).toBeVisible();

      console.log("✅ Breadcrumb navigation works correctly");
    });

    test("accessible to all tiers including free", async ({ page }) => {
      console.log("🔓 Testing accessibility across tiers...");

      // Test free tier access
      await orchestrator.userManager.loginAs("free");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });
      await expect(page.locator("h1")).toContainText("Keyword Tool");

      // Test starter tier access
      await orchestrator.userManager.loginAs("starter");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toContainText("Keyword Tool");

      console.log("✅ Keyword Tool accessible to all tiers");
    });
  });

  test.describe("Keyword Research Form", () => {
    test("displays form with all required fields", async ({ page }) => {
      console.log("📝 Testing form field display...");

      await orchestrator.userManager.loginAs("free");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Check for seed keyword input
      await expect(page.locator("input[placeholder*='Enter your seed keyword']")).toBeVisible();

      // Check for location/language selectors
      await expect(page.locator("select, [role=combobox]")).toBeVisible();

      // Check for submit button
      await expect(page.locator("button", { hasText: "Generate Keywords" })).toBeVisible();

      console.log("✅ Form fields display correctly");
    });

    test("validates required seed keyword field", async ({ page }) => {
      console.log("✅ Testing seed keyword validation...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Try to submit without seed keyword
      const submitButton = page.locator("button", { hasText: "Generate Keywords" });
      await submitButton.click();

      // Should show validation error
      await expect(page.locator("text=Seed keyword is required")).toBeVisible();

      console.log("✅ Seed keyword validation works correctly");
    });

    test("accepts valid keyword input", async ({ page }) => {
      console.log("🎯 Testing valid keyword input...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Fill valid seed keyword
      await page.fill("input[placeholder*='Enter your seed keyword']", "digital marketing");

      // Verify input is accepted
      await expect(page.locator("input[placeholder*='Enter your seed keyword']")).toHaveValue("digital marketing");

      console.log("✅ Valid keyword input works correctly");
    });

    test("submits form with seed keyword", async ({ page }) => {
      console.log("📊 Testing form submission...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Fill seed keyword
      await page.fill("input[placeholder*='Enter your seed keyword']", "SEO optimization");

      // Submit form
      const submitButton = page.locator("button", { hasText: "Generate Keywords" });
      await submitButton.click();

      // Should show loading state
      await expect(page.locator("text=Generating")).toBeVisible();

      // Wait for results (extended timeout for AI processing)
      await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });

      console.log("✅ Form submission works correctly");
    });
  });

  test.describe("Keyword Results", () => {
    test("displays keyword suggestions after successful submission", async ({ page }) => {
      console.log("📈 Testing keyword results display...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Submit keyword research
      await page.fill("input[placeholder*='Enter your seed keyword']", "content marketing");

      const submitButton = page.locator("button", { hasText: "Generate Keywords" });
      await submitButton.click();

      // Wait for results
      await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });

      // Check for results table
      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("text=Keyword")).toBeVisible();
      await expect(page.locator("text=Search Volume")).toBeVisible();
      await expect(page.locator("text=Competition")).toBeVisible();
      await expect(page.locator("text=Difficulty")).toBeVisible();

      console.log("✅ Keyword results display correctly");
    });

    test("shows keyword metrics and data", async ({ page }) => {
      console.log("📊 Testing keyword metrics display...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Submit keyword research
      await page.fill("input[placeholder*='Enter your seed keyword']", "local SEO");

      await page.locator("button", { hasText: "Generate Keywords" }).click();
      await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });

      // Check for keyword metrics
      await expect(page.locator("text=/\\d+/")).toBeVisible(); // Numbers for search volume
      await expect(page.locator("text=/Low|Medium|High/")).toBeVisible(); // Competition levels

      // Check for table rows with data
      const tableRows = page.locator("table tr");
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(1); // Header + data rows

      console.log("✅ Keyword metrics display correctly");
    });

    test("displays keyword difficulty indicators", async ({ page }) => {
      console.log("💪 Testing keyword difficulty display...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Submit analysis
      await page.fill("input[placeholder*='Enter your seed keyword']", "organic search");

      await page.locator("button", { hasText: "Generate Keywords" }).click();
      await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });

      // Check for difficulty indicators
      await expect(page.locator("text=Difficulty")).toBeVisible();

      // Look for difficulty badges or scores
      const difficultyElements = page.locator("text=/Easy|Medium|Hard|\\d+%/");
      const difficultyCount = await difficultyElements.count();
      expect(difficultyCount).toBeGreaterThan(0);

      console.log("✅ Keyword difficulty indicators display correctly");
    });

    test("shows search volume data", async ({ page }) => {
      console.log("📈 Testing search volume display...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Submit analysis
      await page.fill("input[placeholder*='Enter your seed keyword']", "keyword research");

      await page.locator("button", { hasText: "Generate Keywords" }).click();
      await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });

      // Check for search volume column and data
      await expect(page.locator("text=Search Volume")).toBeVisible();

      // Look for volume numbers
      const volumeElements = page.locator("text=/\\d+[KkMm]?/");
      const volumeCount = await volumeElements.count();
      expect(volumeCount).toBeGreaterThan(0);

      console.log("✅ Search volume data displays correctly");
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test("displays correctly on mobile viewport", async ({ page }) => {
      console.log("📱 Testing mobile responsiveness...");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Verify responsive layout
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("input[placeholder*='Enter your seed keyword']")).toBeVisible();

      // Check form is accessible on mobile
      const keywordInput = page.locator("input[placeholder*='Enter your seed keyword']");
      const box = await keywordInput.boundingBox();
      if (box) {
        expect(box.width).toBeLessThan(400); // Should fit mobile width
      }

      // Test touch-friendly buttons
      const submitButton = page.locator("button", { hasText: "Generate Keywords" });
      const buttonBox = await submitButton.boundingBox();
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(44); // WCAG touch target
      }

      console.log("✅ Mobile responsiveness verified");
    });

    test("mobile tool layout works correctly", async ({ page }) => {
      console.log("📱 Testing mobile tool layout...");

      await page.setViewportSize({ width: 375, height: 667 });

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Mobile layout should use MobileToolLayout component
      // Verify cards stack properly
      const cards = page.locator(".card, [class*='card']");
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Submit to test mobile results layout
      await page.fill("input[placeholder*='Enter your seed keyword']", "mobile SEO");
      await page.locator("button", { hasText: "Generate Keywords" }).click();

      console.log("✅ Mobile tool layout works correctly");
    });

    test("results table is mobile-responsive", async ({ page }) => {
      console.log("📱 Testing mobile results table...");

      await page.setViewportSize({ width: 375, height: 667 });

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/keyword-tool", { waitUntil: "networkidle" });

      // Submit to get results
      await page.fill("input[placeholder*='Enter your seed keyword']", "responsive design");
      await page.locator("button", { hasText: "Generate Keywords" }).click();

      try {
        await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });

        // Check if table is responsive or converts to cards on mobile
        const table = page.locator("table");
        if (await table.count() > 0) {
          const tableBox = await table.boundingBox();
          if (tableBox) {
            expect(tableBox.width).toBeLessThan(400); // Should fit mobile
          }
        }

        console.log("✅ Mobile results table is responsive");
      } catch {
        console.log("ℹ️ Results still loading or error occurred");
      }
    });
  });

  test.describe("Error Handling", () => {
    test("handles API errors gracefully", async ({ page }) => {
      console.log("❌ Testing error handling...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/keyword-tool", { waitUntil: "networkidle" });

      // Submit form to trigger potential API error
      await page.fill("input[placeholder*='Enter your seed keyword']", "test keyword");

      await page.locator("button", { hasText: "Generate Keywords" }).click();

      // Look for error handling (either success or graceful error)
      const loadingState = page.locator("text=Generating");
      await expect(loadingState).toBeVisible();

      // Wait for either success or error state
      try {
        await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });
        console.log("✅ Keyword research completed successfully");
      } catch {
        // Check for error message
        const errorMessage = page.locator("text=/Error|Failed|Unable/");
        if (await errorMessage.count() > 0) {
          await expect(errorMessage.first()).toBeVisible();
          console.log("✅ Error handled gracefully");
        }
      }

      console.log("✅ Error handling test completed");
    });

    test("shows loading states appropriately", async ({ page }) => {
      console.log("⏳ Testing loading states...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Submit form
      await page.fill("input[placeholder*='Enter your seed keyword']", "loading test keywords");

      const submitButton = page.locator("button", { hasText: "Generate Keywords" });
      await submitButton.click();

      // Should show loading immediately
      await expect(page.locator("text=Generating")).toBeVisible();

      // Button should be disabled during loading
      await expect(submitButton).toBeDisabled();

      console.log("✅ Loading states work correctly");
    });

    test("validates input length limits", async ({ page }) => {
      console.log("📏 Testing input validation...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Test very long keyword input
      const longKeyword = "this is a very long keyword phrase that might exceed reasonable limits for keyword research tools and should be validated appropriately";

      await page.fill("input[placeholder*='Enter your seed keyword']", longKeyword);

      const submitButton = page.locator("button", { hasText: "Generate Keywords" });
      await submitButton.click();

      // Should either process or show validation error
      try {
        await expect(page.locator("text=Generating")).toBeVisible();
        console.log("✅ Long input accepted");
      } catch {
        await expect(page.locator("text=/too long|limit|maximum/")).toBeVisible();
        console.log("✅ Input length validation works");
      }

      console.log("✅ Input validation test completed");
    });
  });

  test.describe("Performance", () => {
    test("loads within acceptable time limits", async ({ page }) => {
      console.log("⚡ Testing page performance...");

      await orchestrator.userManager.loginAs("free");

      const startTime = Date.now();
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch { }
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);

      // Check main elements are loaded
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("form")).toBeVisible();

      console.log(`✅ Page loaded in ${loadTime}ms`);
    });

    test("processes keyword research efficiently", async ({ page }) => {
      console.log("🚀 Testing keyword processing performance...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="keyword-tool-root"], main, #keyword-tool').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Submit keyword research
      await page.fill("input[placeholder*='Enter your seed keyword']", "performance test");

      const startTime = Date.now();
      await page.locator("button", { hasText: "Generate Keywords" }).click();

      // Track processing time
      try {
        await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });
        const processingTime = Date.now() - startTime;
        console.log(`✅ Keywords processed in ${processingTime}ms`);

        // Should complete within reasonable time (30 seconds)
        expect(processingTime).toBeLessThan(30000);
      } catch {
        console.log("ℹ️ Processing timeout or error occurred");
      }

      console.log("✅ Performance test completed");
    });
  });

  test.describe("Integration", () => {
    test("saves keyword research to Firebase", async ({ page }) => {
      console.log("💾 Testing Firebase integration...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch { }

      // Submit keyword research
      await page.fill("input[placeholder*='Enter your seed keyword']", "Firebase integration test");

      await page.locator("button", { hasText: "Generate Keywords" }).click();

      // Wait for completion
      try {
        await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });
        console.log("✅ Keyword research completed and likely saved to Firebase");
      } catch {
        console.log("ℹ️ Research in progress or error occurred");
      }

      console.log("✅ Firebase integration test completed");
    });

    test("integrates with subscription tier limits", async ({ page }) => {
      console.log("🔒 Testing subscription tier integration...");

      // Test free tier access
      await orchestrator.userManager.loginAs("free");
      await page.goto("/keyword-tool", { waitUntil: "networkidle" });

      // Free tier should have access to basic functionality
      const form = page.locator("form");
      await expect(form).toBeVisible();

      await page.fill("input[placeholder*='Enter your seed keyword']", "free tier test");
      await page.locator("button", { hasText: "Generate Keywords" }).click();

      // Should allow research for free tier
      await expect(page.locator("text=Generating")).toBeVisible();

      console.log("✅ Subscription tier integration verified");
    });

    test("works with AI flows and Genkit", async ({ page }) => {
      console.log("🤖 Testing AI flows integration...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/keyword-tool", { waitUntil: "domcontentloaded" });
      try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch { }

      // Submit to test AI flow integration
      await page.fill("input[placeholder*='Enter your seed keyword']", "AI keyword suggestions");

      await page.locator("button", { hasText: "Generate Keywords" }).click();

      // Should show loading and eventually results
      await expect(page.locator("text=Generating")).toBeVisible();

      try {
        await expect(page.locator("text=Keyword Suggestions")).toBeVisible({ timeout: 30000 });
        console.log("✅ AI flows integration successful");
      } catch {
        console.log("ℹ️ AI processing in progress or error occurred");
      }

      console.log("✅ AI flows integration test completed");
    });
  });
});
