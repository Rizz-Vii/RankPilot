import { test, expect, Page } from "@playwright/test";
import { TestOrchestrator, UserFlow } from "../../../utils/test-orchestrator";
import { GracefulTestUtils } from "../../../utils/graceful-test-utils";

/**
 * Team Reports - Comprehensive Test Suite
 * Tests report creation, scheduling, sharing, and management functionality
 */

test.describe("Team Reports - Comprehensive Suite", () => {
  let orchestrator: TestOrchestrator;
  let gracefulUtils: GracefulTestUtils;

  test.beforeEach(async ({ page }) => {
    orchestrator = new TestOrchestrator(page);
    gracefulUtils = new GracefulTestUtils(page);
    
    // Set extended timeouts for complex interactions
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(20000);
  });

  test.describe("Page Loading and Navigation", () => {
    test("loads team reports page with proper authentication", async ({ page }) => {
      console.log("📊 Testing Team Reports page loading...");

      // Test with starter tier (should have access)
      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Verify page loads correctly
      await expect(page.locator("h1")).toContainText("Team Reports");
      await expect(page.locator("text=Create, manage, and share SEO performance reports")).toBeVisible();

      // Verify navigation elements
      await expect(page.locator("button", { hasText: "Back to Team" })).toBeVisible();
      await expect(page.locator("button", { hasText: "New Report" })).toBeVisible();

      console.log("✅ Team Reports page loads correctly");
    });

    test("redirects free tier users appropriately", async ({ page }) => {
      console.log("🚫 Testing free tier access restrictions...");

      // Test with free tier (should be redirected or see upgrade prompt)
      await orchestrator.userManager.loginAs("free");
      await orchestrator.userManager.verifyAccess("/team/reports", false);

      console.log("✅ Free tier access properly restricted");
    });

    test("back navigation works correctly", async ({ page }) => {
      console.log("⬅️ Testing back navigation...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      const backButton = page.locator("button", { hasText: "Back to Team" });
      await expect(backButton).toBeVisible();
      await backButton.click();

      await expect(page).toHaveURL(/\/team$/);
      await expect(page.locator("h1")).toContainText("Team Management");

      console.log("✅ Back navigation works correctly");
    });
  });

  test.describe("Report Creation", () => {
    test("creates new report with all fields", async ({ page }) => {
      console.log("➕ Testing comprehensive report creation...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Open create dialog
      const newReportButton = page.locator("button", { hasText: "New Report" });
      await newReportButton.click();

      // Verify dialog opens
      await expect(page.locator("[role=dialog]")).toBeVisible();
      await expect(page.locator("text=Create New Report")).toBeVisible();

      // Fill all form fields
      await page.fill("#title", "E2E Test Report");
      await page.fill("#description", "Test report created by automation");
      
      // Set type
      await page.locator("[role=combobox]").first().click();
      await page.locator("text=Monthly").click();

      // Set status to scheduled
      await page.locator("[role=combobox]").nth(1).click();
      await page.locator("text=Scheduled").click();

      // Set scheduled date (should appear after selecting scheduled)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateTimeString = tomorrow.toISOString().slice(0, 16);
      await page.fill("#scheduledDate", dateTimeString);

      // Add recipients and tags
      await page.fill("#recipients", "test@example.com, manager@example.com");
      await page.fill("#tags", "automation, e2e, test");

      // Submit form
      const createButton = page.locator("button", { hasText: "Create Report" });
      await createButton.click();

      // Verify report appears in list
      await expect(page.locator("text=E2E Test Report")).toBeVisible();
      await expect(page.locator("text=Test report created by automation")).toBeVisible();

      // Verify badges are displayed
      await expect(page.locator(".bg-green-500", { hasText: "Monthly" })).toBeVisible();
      await expect(page.locator(".bg-blue-500", { hasText: "Scheduled" })).toBeVisible();

      console.log("✅ Report created successfully with all fields");
    });

    test("validates required fields", async ({ page }) => {
      console.log("📝 Testing form validation...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Open create dialog
      await page.locator("button", { hasText: "New Report" }).click();

      // Try to submit empty form
      const createButton = page.locator("button", { hasText: "Create Report" });
      await createButton.click();

      // Should show validation error
      await expect(page.locator("text=Report title is required")).toBeVisible();

      console.log("✅ Form validation works correctly");
    });

    test("handles scheduled report creation", async ({ page }) => {
      console.log("⏰ Testing scheduled report creation...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Open create dialog
      await page.locator("button", { hasText: "New Report" }).click();

      // Fill basic fields
      await page.fill("#title", "Scheduled Test Report");
      await page.fill("#description", "Report scheduled for future delivery");

      // Set status to scheduled
      await page.locator("[role=combobox]").nth(1).click();
      await page.locator("text=Scheduled").click();

      // Verify scheduled date field appears
      await expect(page.locator("#scheduledDate")).toBeVisible();

      // Set future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateTimeString = futureDate.toISOString().slice(0, 16);
      await page.fill("#scheduledDate", dateTimeString);

      // Create report
      await page.locator("button", { hasText: "Create Report" }).click();

      // Verify scheduled report appears with correct status
      await expect(page.locator("text=Scheduled Test Report")).toBeVisible();
      await expect(page.locator(".bg-blue-500", { hasText: "Scheduled" })).toBeVisible();

      console.log("✅ Scheduled report creation works correctly");
    });
  });

  test.describe("Report Management", () => {
    test("displays mock reports correctly", async ({ page }) => {
      console.log("📋 Testing report display and data...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Should display mock reports
      await expect(page.locator("text=Monthly SEO Performance Report")).toBeVisible();
      await expect(page.locator("text=Q1 Competitive Analysis")).toBeVisible();
      await expect(page.locator("text=Weekly Content Performance")).toBeVisible();

      // Verify report cards display all required elements
      // Check type badges
      await expect(page.locator(".bg-green-500", { hasText: "Monthly" })).toBeVisible();
      await expect(page.locator(".bg-purple-500", { hasText: "Quarterly" })).toBeVisible();
      await expect(page.locator(".bg-blue-500", { hasText: "Weekly" })).toBeVisible();

      // Check status badges  
      await expect(page.locator(".bg-green-500", { hasText: "Published" })).toBeVisible();
      await expect(page.locator(".bg-blue-500", { hasText: "Scheduled" })).toBeVisible();
      await expect(page.locator(".bg-gray-500", { hasText: "Draft" })).toBeVisible();

      // Check content sections
      await expect(page.locator("text=Content Sections")).toBeVisible();
      await expect(page.locator("text=Keywords")).toBeVisible();
      await expect(page.locator("text=Competitors")).toBeVisible();

      // Check metrics
      await expect(page.locator("text=Views")).toBeVisible();
      await expect(page.locator("text=Downloads")).toBeVisible();
      await expect(page.locator("text=Shares")).toBeVisible();

      console.log("✅ Reports display correctly with all data");
    });

    test("report dropdown menu functions", async ({ page }) => {
      console.log("⚙️ Testing report dropdown menu...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Find first report dropdown button
      const dropdownButton = page.locator("button").filter({ has: page.locator("svg") }).first();
      await dropdownButton.click();

      // Verify menu options
      await expect(page.locator("text=View")).toBeVisible();
      await expect(page.locator("text=Download")).toBeVisible();
      await expect(page.locator("text=Share")).toBeVisible();
      await expect(page.locator("text=Edit")).toBeVisible();
      await expect(page.locator("text=Delete")).toBeVisible();

      console.log("✅ Report dropdown menu works correctly");
    });

    test("downloads report successfully", async ({ page }) => {
      console.log("⬇️ Testing report download...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Find first report and open dropdown
      const firstReport = page.locator('.hover\\:shadow-lg').first();
      const dropdownButton = firstReport.locator("button").filter({ has: page.locator("svg") }).first();
      await dropdownButton.click();

      // Click download
      const downloadButton = page.locator("text=Download");
      await downloadButton.click();

      // Verify success message
      await expect(page.locator("text=Report download started")).toBeVisible();

      console.log("✅ Report download works correctly");
    });

    test("deletes report successfully", async ({ page }) => {
      console.log("🗑️ Testing report deletion...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Create a test report first
      await page.locator("button", { hasText: "New Report" }).click();
      await page.fill("#title", "Report to Delete");
      await page.locator("button", { hasText: "Create Report" }).click();
      await expect(page.locator("text=Report to Delete")).toBeVisible();

      // Now delete it
      const reportToDelete = page.locator("text=Report to Delete").locator("..");
      const dropdownButton = reportToDelete.locator("button").filter({ has: page.locator("svg") }).first();
      await dropdownButton.click();

      const deleteButton = page.locator("text=Delete");
      await deleteButton.click();

      // Verify report is removed
      await expect(page.locator("text=Report to Delete")).not.toBeVisible();
      await expect(page.locator("text=Report deleted successfully")).toBeVisible();

      console.log("✅ Report deletion works correctly");
    });
  });

  test.describe("Search and Filtering", () => {
    test("searches reports by title", async ({ page }) => {
      console.log("🔍 Testing report search functionality...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Search for specific report
      const searchInput = page.locator("input[placeholder*='Search reports']");
      await searchInput.fill("Monthly");

      // Should show only matching reports
      await expect(page.locator("text=Monthly SEO Performance Report")).toBeVisible();
      await expect(page.locator("text=Weekly Content Performance")).not.toBeVisible();

      // Clear search
      await searchInput.clear();
      await expect(page.locator("text=Weekly Content Performance")).toBeVisible();

      console.log("✅ Report search works correctly");
    });

    test("filters reports by type", async ({ page }) => {
      console.log("🎯 Testing type filtering...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Filter by Monthly type
      const typeFilter = page.locator("select, [role=combobox]").filter({ hasText: "All Types" }).first();
      await typeFilter.click();
      await page.locator("text=Monthly").click();

      // Should show only monthly reports
      await expect(page.locator("text=Monthly SEO Performance Report")).toBeVisible();
      await expect(page.locator("text=Weekly Content Performance")).not.toBeVisible();

      console.log("✅ Type filtering works correctly");
    });

    test("filters reports by status", async ({ page }) => {
      console.log("⚡ Testing status filtering...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Filter by Published status
      const statusFilter = page.locator("select, [role=combobox]").filter({ hasText: "All Statuses" }).first();
      await statusFilter.click();
      await page.locator("text=Published").click();

      // Should show only published reports
      await expect(page.locator("text=Monthly SEO Performance Report")).toBeVisible(); // Published
      await expect(page.locator("text=Weekly Content Performance")).not.toBeVisible(); // Draft

      console.log("✅ Status filtering works correctly");
    });

    test("shows empty state when no reports match", async ({ page }) => {
      console.log("📭 Testing empty state display...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Search for non-existent report
      const searchInput = page.locator("input[placeholder*='Search reports']");
      await searchInput.fill("NonExistentReport");

      // Should show empty state
      await expect(page.locator("text=No reports found")).toBeVisible();
      await expect(page.locator("text=Try adjusting your filters")).toBeVisible();

      console.log("✅ Empty state displays correctly");
    });
  });

  test.describe("Content Sections and Configuration", () => {
    test("displays content section badges correctly", async ({ page }) => {
      console.log("🏷️ Testing content section display...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Check for content section indicators
      await expect(page.locator("text=Content Sections")).toBeVisible();
      
      // Check specific content badges
      await expect(page.locator("text=Keywords")).toBeVisible();
      await expect(page.locator("text=Competitors")).toBeVisible();
      await expect(page.locator("text=Content")).toBeVisible();
      await expect(page.locator("text=Technical")).toBeVisible();

      console.log("✅ Content sections display correctly");
    });

    test("shows recipient information", async ({ page }) => {
      console.log("👥 Testing recipient display...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Check for recipient information
      await expect(page.locator("text=Recipients")).toBeVisible();
      
      // Should show recipient count and emails
      const recipientSections = page.locator("text=Recipients");
      await expect(recipientSections.first()).toBeVisible();

      console.log("✅ Recipient information displays correctly");
    });

    test("displays schedule information for scheduled reports", async ({ page }) => {
      console.log("⏰ Testing schedule information display...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Look for scheduled reports and their schedule info
      const scheduledBadge = page.locator(".bg-blue-500", { hasText: "Scheduled" });
      await expect(scheduledBadge).toBeVisible();

      // Check for schedule information
      await expect(page.locator("text=Scheduled for")).toBeVisible();

      console.log("✅ Schedule information displays correctly");
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test("displays correctly on mobile viewport", async ({ page }) => {
      console.log("📱 Testing mobile responsiveness...");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/reports", { waitUntil: "networkidle" });

      // Verify responsive layout
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("button", { hasText: "New Report" })).toBeVisible();

      // Check that cards stack properly on mobile
      const reportCards = page.locator('.grid');
      await expect(reportCards).toHaveClass(/grid/);

      // Test touch-friendly buttons (48px minimum)
      const buttons = page.locator("button");
      for (let i = 0; i < Math.min(await buttons.count(), 3); i++) {
        const button = buttons.nth(_i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44); // Close to 48px WCAG requirement
        }
      }

      console.log("✅ Mobile responsiveness verified");
    });
  });

  test.describe("Performance", () => {
    test("loads within acceptable time limits", async ({ page }) => {
      console.log("⚡ Testing page performance...");

      await orchestrator.userManager.loginAs("starter");

      const startTime = Date.now();
      await page.goto("/team/reports", { waitUntil: "networkidle" });
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);

      // Check for loading states
      const reportCards = page.locator('.grid .hover\\:shadow-lg');
      const cardCount = await reportCards.count();
      expect(cardCount).toBeGreaterThan(0); // Should have loaded content

      console.log(`✅ Page loaded in ${loadTime}ms`);
    });
  });
});
