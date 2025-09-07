/**
 * Global Setup with Page Warming Strategy
 * Pre-warms AI-heavy pages to reduce test execution time
 */

import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("🌟 Starting RankPilot Test Suite with Page Warming...");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Check if dev server is running
  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

  try {
    console.log("🔍 Checking development server...");
    await page.goto(baseURL, { timeout: 10000 });
    console.log("✅ Development server is running");
  } catch {
    console.log(
      "❌ Development server not running. Please start with: npm run dev-no-turbopack"
    );
    throw new Error("Development server not available");
  }

  // Define pages to warm by priority and AI intensity
  const warmingSequence = [
    // Light pages first (build caching)
    { path: "/", name: "Homepage", timeout: 15000, priority: "light" },
    { path: "/login", name: "Login", timeout: 15000, priority: "light" },
    { path: "/register", name: "Register", timeout: 15000, priority: "light" },

    // Medium AI pages (authenticated)
    {
      path: "/dashboard",
      name: "Dashboard",
      timeout: 25000,
      priority: "medium",
      requiresAuth: true,
    },
    {
      path: "/keyword-tool",
      name: "Keyword Tool",
      timeout: 25000,
      priority: "medium",
      requiresAuth: true,
    },
    {
      path: "/performance",
      name: "Performance",
      timeout: 25000,
      priority: "medium",
      requiresAuth: true,
    },

    // Heavy AI pages (compilation intensive)
    {
      path: "/content-analyzer",
      name: "Content Analyzer",
      timeout: 45000,
      priority: "heavy",
      requiresAuth: true,
    },
    {
      path: "/neuroseo",
      name: "NeuroSEO Dashboard",
      timeout: 35000,
      priority: "heavy",
      requiresAuth: true,
    },
    {
      path: "/competitors",
      name: "Competitors",
      timeout: 30000,
      priority: "heavy",
      requiresAuth: true,
    },
  ];

  // Pre-authenticate for protected pages
  let isAuthenticated = false;

  console.log("🔐 Pre-authenticating for protected pages...");
  try {
    await page.goto(`${baseURL}/login`);

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Use unified test user credentials
    await page.fill('input[type="email"]', "starter@rankpilot.com");
    await page.fill('input[type="password"]', "starter123");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for successful login redirect
    await page.waitForURL("**/dashboard", { timeout: 25000 });
    isAuthenticated = true;
    console.log("✅ Authentication successful");
  } catch (authError: unknown) {
    const authMsg =
      authError && typeof authError === "object" && "message" in authError
        ? String((authError as { message?: unknown }).message)
        : String(authError);
    console.log(`⚠️ Authentication failed: ${authMsg}`);
    console.log("   Will skip protected pages during warming");
  }

  // Warm pages in sequence
  for (const pageInfo of warmingSequence) {
    // Skip protected pages if not authenticated
    if (pageInfo.requiresAuth && !isAuthenticated) {
      console.log(`⏭️ Skipping ${pageInfo.name} (requires authentication)`);
      continue;
    }

    console.log(
      `🔄 Warming ${pageInfo.name} (${pageInfo.priority} priority)...`
    );
    const startTime = Date.now();

    try {
      await page.goto(`${baseURL}${pageInfo.path}`, {
        waitUntil: "domcontentloaded",
        timeout: pageInfo.timeout,
      });

      // Wait for AI components to initialize
      if (pageInfo.priority === "heavy") {
        console.log(`   ⏳ Allowing AI components to compile...`);
        await page.waitForTimeout(5000); // Extended wait for AI compilation
      } else if (pageInfo.priority === "medium") {
        await page.waitForTimeout(2000); // Medium wait for moderate AI
      } else {
        await page.waitForTimeout(1000); // Light wait for basic pages
      }

      const loadTime = Date.now() - startTime;
      console.log(`   ✅ ${pageInfo.name} warmed in ${loadTime}ms`);
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : String(error);
      console.log(`   ⚠️ ${pageInfo.name} warming failed: ${msg}`);
      // Continue with other pages
    }
  }

  console.log("🎯 Page warming completed! Test execution will be faster.");

  await context.close();
  await browser.close();
}

export default globalSetup;
