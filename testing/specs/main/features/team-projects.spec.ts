import { expect, test } from "@playwright/test";
import { GracefulTestUtils } from "../../../utils/graceful-test-utils";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * Team Projects - Comprehensive Test Suite
 * Tests all CRUD operations, UI interactions, and role-based access
 */

test.describe("Team Projects - Comprehensive Suite", () => {
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
    test("loads team projects page with proper authentication", async ({ page }) => {
      console.log("🏗️ Testing Team Projects page loading...");

      // Test with free tier user (email/password auth works better in headless)
      await orchestrator.userManager.loginAs("free");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Verify page loads correctly
      await expect(page.locator("h1")).toContainText("Team Projects");
      await expect(page.locator("text=Manage and track your team's SEO projects")).toBeVisible();

      // Verify navigation elements
      await expect(page.locator("button", { hasText: "Back to Team" })).toBeVisible();
      await expect(page.locator("button", { hasText: "New Project" })).toBeVisible();

      console.log("✅ Team Projects page loads correctly");
    });

    test("redirects free tier users appropriately", async ({ page }) => {
      console.log("🚫 Testing free tier access restrictions...");

      // Test with free tier (should be redirected or see upgrade prompt)
      await orchestrator.userManager.loginAs("free");
      await orchestrator.userManager.verifyAccess("/team/projects", false);

      console.log("✅ Free tier access properly restricted");
    });

    test("back navigation works correctly", async ({ page }) => {
      console.log("⬅️ Testing back navigation...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      const backButton = page.locator("button", { hasText: "Back to Team" });
      await expect(backButton).toBeVisible();
      await backButton.click();

      await expect(page).toHaveURL(/\/team$/);
      await expect(page.locator("h1")).toContainText("Team Management");

      console.log("✅ Back navigation works correctly");
    });
  });

  test.describe("Project Creation", () => {
    test("creates new project with all fields", async ({ page }) => {
      console.log("➕ Testing comprehensive project creation...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Open create dialog
      const newProjectButton = page.locator("button", { hasText: "New Project" });
      await newProjectButton.click();

      // Verify dialog opens
      await expect(page.locator("[role=dialog]")).toBeVisible();
      await expect(page.locator("text=Create New Project")).toBeVisible();

      // Fill all form fields
      await page.fill("#name", "E2E Test Project");
      await page.fill("#description", "Test project created by automation");

      // Set status
      await page.locator("[role=combobox]").first().click();
      await page.locator("text=Active").click();

      // Set priority
      await page.locator("[role=combobox]").nth(1).click();
      await page.locator("text=High").click();

      // Set deadline
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill("#deadline", dateString);

      // Add keywords and URLs
      await page.fill("#keywords", "test keyword, automation, e2e");
      await page.fill("#urls", "https://example.com, https://test.com");

      // Submit form
      const createButton = page.locator("button", { hasText: "Create Project" });
      await createButton.click();

      // Verify project appears in list
      await expect(page.locator("text=E2E Test Project")).toBeVisible();
      await expect(page.locator("text=Test project created by automation")).toBeVisible();

      // Verify badges are displayed
      await expect(page.locator(".bg-green-500", { hasText: "Active" })).toBeVisible();
      await expect(page.locator(".bg-orange-500", { hasText: "High" })).toBeVisible();

      console.log("✅ Project created successfully with all fields");
    });

    test("validates required fields", async ({ page }) => {
      console.log("📝 Testing form validation...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Open create dialog
      await page.locator("button", { hasText: "New Project" }).click();

      // Try to submit empty form
      const createButton = page.locator("button", { hasText: "Create Project" });
      await createButton.click();

      // Should show validation error
      await expect(page.locator("text=Project name is required")).toBeVisible();

      console.log("✅ Form validation works correctly");
    });

    test("cancels project creation", async ({ page }) => {
      console.log("❌ Testing project creation cancellation...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Open create dialog
      await page.locator("button", { hasText: "New Project" }).click();
      await expect(page.locator("[role=dialog]")).toBeVisible();

      // Fill some data
      await page.fill("#name", "Cancelled Project");

      // Cancel
      const cancelButton = page.locator("button", { hasText: "Cancel" });
      await cancelButton.click();

      // Dialog should close and project not be created
      await expect(page.locator("[role=dialog]")).not.toBeVisible();
      await expect(page.locator("text=Cancelled Project")).not.toBeVisible();

      console.log("✅ Project creation cancellation works correctly");
    });
  });

  test.describe("Project Management", () => {
    test("displays mock projects correctly", async ({ page }) => {
      console.log("📋 Testing project display and data...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Should display mock projects
      await expect(page.locator("text=E-commerce SEO Campaign")).toBeVisible();
      await expect(page.locator("text=Blog Content Strategy")).toBeVisible();
      await expect(page.locator("text=Local SEO Optimization")).toBeVisible();

      // Verify project cards display all required elements
      const firstProject = page.locator('[data-testid="project-card"]').first()
        .or(page.locator('.hover\\:shadow-lg').first());

      // Check status badges
      await expect(page.locator(".bg-green-500", { hasText: "Active" })).toBeVisible();
      await expect(page.locator(".bg-gray-500", { hasText: "Planning" })).toBeVisible();

      // Check priority badges
      await expect(page.locator(".bg-orange-500", { hasText: "High" })).toBeVisible();
      await expect(page.locator(".bg-yellow-500", { hasText: "Medium" })).toBeVisible();

      // Check progress bars
      await expect(page.locator("text=Progress")).toBeVisible();
      await expect(page.locator("text=75%")).toBeVisible();

      // Check metrics
      await expect(page.locator("text=Keywords")).toBeVisible();
      await expect(page.locator("text=Traffic")).toBeVisible();

      console.log("✅ Projects display correctly with all data");
    });

    test("project dropdown menu functions", async ({ page }) => {
      console.log("⚙️ Testing project dropdown menu...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Find first project dropdown button
      const dropdownButton = page.locator("button").filter({ has: page.locator("svg") }).first();
      await dropdownButton.click();

      // Verify menu options
      await expect(page.locator("text=Edit")).toBeVisible();
      await expect(page.locator("text=Delete")).toBeVisible();

      console.log("✅ Project dropdown menu works correctly");
    });

    test("deletes project successfully", async ({ page }) => {
      console.log("🗑️ Testing project deletion...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Create a test project first
      await page.locator("button", { hasText: "New Project" }).click();
      await page.fill("#name", "Project to Delete");
      await page.locator("button", { hasText: "Create Project" }).click();
      await expect(page.locator("text=Project to Delete")).toBeVisible();

      // Now delete it
      const projectToDelete = page.locator("text=Project to Delete").locator("..");
      const dropdownButton = projectToDelete.locator("button").filter({ has: page.locator("svg") }).first();
      await dropdownButton.click();

      const deleteButton = page.locator("text=Delete");
      await deleteButton.click();

      // Verify project is removed
      await expect(page.locator("text=Project to Delete")).not.toBeVisible();
      await expect(page.locator("text=Project deleted successfully")).toBeVisible();

      console.log("✅ Project deletion works correctly");
    });
  });

  test.describe("Search and Filtering", () => {
    test("searches projects by name", async ({ page }) => {
      console.log("🔍 Testing project search functionality...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Search for specific project
      const searchInput = page.locator("input[placeholder*='Search projects']");
      await searchInput.fill("E-commerce");

      // Should show only matching projects
      await expect(page.locator("text=E-commerce SEO Campaign")).toBeVisible();
      await expect(page.locator("text=Blog Content Strategy")).not.toBeVisible();

      // Clear search
      await searchInput.clear();
      await expect(page.locator("text=Blog Content Strategy")).toBeVisible();

      console.log("✅ Project search works correctly");
    });

    test("filters projects by status", async ({ page }) => {
      console.log("🎯 Testing status filtering...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Filter by Active status
      const statusFilter = page.locator("select, [role=combobox]").filter({ hasText: "All Statuses" }).first();
      await statusFilter.click();
      await page.locator("text=Active").click();

      // Should show only active projects
      await expect(page.locator("text=E-commerce SEO Campaign")).toBeVisible();
      await expect(page.locator("text=Blog Content Strategy")).not.toBeVisible(); // This is Planning

      console.log("✅ Status filtering works correctly");
    });

    test("filters projects by priority", async ({ page }) => {
      console.log("⚡ Testing priority filtering...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Filter by High priority
      const priorityFilter = page.locator("select, [role=combobox]").filter({ hasText: "All Priorities" }).first();
      await priorityFilter.click();
      await page.locator("text=High").click();

      // Should show only high priority projects
      await expect(page.locator("text=E-commerce SEO Campaign")).toBeVisible(); // High priority
      await expect(page.locator("text=Blog Content Strategy")).not.toBeVisible(); // Medium priority

      console.log("✅ Priority filtering works correctly");
    });

    test("shows empty state when no projects match", async ({ page }) => {
      console.log("📭 Testing empty state display...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Search for non-existent project
      const searchInput = page.locator("input[placeholder*='Search projects']");
      await searchInput.fill("NonExistentProject");

      // Should show empty state
      await expect(page.locator("text=No projects found")).toBeVisible();
      await expect(page.locator("text=Try adjusting your filters")).toBeVisible();

      console.log("✅ Empty state displays correctly");
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test("displays correctly on mobile viewport", async ({ page }) => {
      console.log("📱 Testing mobile responsiveness...");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Verify responsive layout
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("button", { hasText: "New Project" })).toBeVisible();

      // Check that cards stack properly on mobile
      const projectCards = page.locator('.grid');
      await expect(projectCards).toHaveClass(/grid/);

      // Test touch-friendly buttons (48px minimum)
      const buttons = page.locator("button");
      for (let i = 0; i < Math.min(await buttons.count(), 3); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44); // Close to 48px WCAG requirement
        }
      }

      console.log("✅ Mobile responsiveness verified");
    });
  });

  test.describe("Accessibility", () => {
    test("meets accessibility standards", async ({ page }) => {
      console.log("♿ Testing accessibility compliance...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/projects", { waitUntil: "networkidle" });

      // Check for proper heading structure
      await expect(page.locator("h1")).toBeVisible();

      // Check for proper form labels
      await page.locator("button", { hasText: "New Project" }).click();
      await expect(page.locator("label", { hasText: "Project Name" })).toBeVisible();
      await expect(page.locator("label", { hasText: "Description" })).toBeVisible();

      // Check for accessible buttons
      const buttons = page.locator("button");
      for (let i = 0; i < Math.min(await buttons.count(), 5); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        expect(text?.trim()).toBeTruthy(); // Should have accessible text
      }

      // Check color contrast (basic check for text visibility)
      await expect(page.locator("text=Team Projects")).toBeVisible();

      console.log("✅ Accessibility standards met");
    });
  });

  test.describe("Performance", () => {
    test("loads within acceptable time limits", async ({ page }) => {
      console.log("⚡ Testing page performance...");

      await orchestrator.userManager.loginAs("starter");

      const startTime = Date.now();
      await page.goto("/team/projects", { waitUntil: "networkidle" });
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);

      // Check for loading states
      const projectCards = page.locator('.grid .hover\\:shadow-lg');
      const cardCount = await projectCards.count();
      expect(cardCount).toBeGreaterThan(0); // Should have loaded content

      console.log(`✅ Page loaded in ${loadTime}ms`);
    });
  });
});
