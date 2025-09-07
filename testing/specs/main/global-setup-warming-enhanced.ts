/**
 * Enhanced Global Setup with State Persistence & High Memory Allocation
 * Saves warming state and provides enhanced memory management for AI-heavy pages
 */

import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

interface WarmingState {
  timestamp: number;
  warmedPages: string[];
  authenticationReady: boolean;
  memoryProfile: {
    maxMemory: number;
    warmedSuccessfully: string[];
    failed: string[];
  };
}

async function globalSetup(config: FullConfig) {
  console.log(
    "🌟 Starting Enhanced RankPilot Test Suite with State Persistence..."
  );

  const browser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--memory-pressure-off",
      "--max_old_space_size=6144",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
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

  // Initialize warming state
  const warmingState: WarmingState = {
    timestamp: Date.now(),
    warmedPages: [],
    authenticationReady: false,
    memoryProfile: {
      maxMemory: 6144,
      warmedSuccessfully: [],
      failed: [],
    },
  };

  // Pre-authenticate for protected pages
  console.log("🔐 Pre-authenticating with enhanced memory allocation...");
  try {
    await page.goto("/login", { timeout: 15000 });
    await page.fill("#email", "starter.user1@test.com");
    await page.fill("#password", "TestPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 20000 });
    warmingState.authenticationReady = true;
    console.log("✅ Authentication successful with enhanced session");
  } catch {
    console.log("⚠️ Authentication failed, continuing with public pages only");
  }

  // Define comprehensive warming sequence with memory-conscious approach
  const warmingSequence = [
    // Light pages first (build caching and basic warming)
    {
      path: "/",
      name: "Homepage",
      timeout: 15000,
      priority: "light",
      memoryImpact: "low",
    },
    {
      path: "/login",
      name: "Login",
      timeout: 10000,
      priority: "light",
      memoryImpact: "low",
    },
    {
      path: "/register",
      name: "Register",
      timeout: 12000,
      priority: "light",
      memoryImpact: "low",
    },

    // Medium pages (moderate AI components)
    {
      path: "/dashboard",
      name: "Dashboard",
      timeout: 20000,
      priority: "medium",
      memoryImpact: "medium",
    },
    {
      path: "/performance",
      name: "Performance",
      timeout: 25000,
      priority: "medium",
      memoryImpact: "medium",
    },

    // Heavy pages (AI-intensive with enhanced memory)
    {
      path: "/keyword-tool",
      name: "Keyword Tool",
      timeout: 45000,
      priority: "heavy",
      memoryImpact: "high",
    },
    {
      path: "/content-analyzer",
      name: "Content Analyzer",
      timeout: 60000,
      priority: "heavy",
      memoryImpact: "very-high",
    },
    {
      path: "/neuroseo",
      name: "NeuroSEO Dashboard",
      timeout: 45000,
      priority: "heavy",
      memoryImpact: "high",
    },
    {
      path: "/competitors",
      name: "Competitors",
      timeout: 40000,
      priority: "heavy",
      memoryImpact: "high",
    },
  ];

  console.log("🔄 Enhanced warming sequence with memory management...");

  for (const pageConfig of warmingSequence) {
    try {
      console.log(
        `🔄 Warming ${pageConfig.name} (${pageConfig.priority} priority, ${pageConfig.memoryImpact} memory impact)...`
      );
      const startTime = Date.now();

      await page.goto(pageConfig.path, {
        waitUntil: "domcontentloaded",
        timeout: pageConfig.timeout,
      });

      // Enhanced compilation time for AI-heavy pages
      if (pageConfig.priority === "heavy") {
        console.log(
          "   ⏳ Allowing AI components to compile with enhanced memory..."
        );
        await page.waitForTimeout(5000); // Extended compilation time
      } else {
        await page.waitForTimeout(1500); // Standard compilation time
      }

      const loadTime = Date.now() - startTime;
      console.log(`   ✅ ${pageConfig.name} warmed in ${loadTime}ms`);

      warmingState.warmedPages.push(pageConfig.path);
      warmingState.memoryProfile.warmedSuccessfully.push(pageConfig.name);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ⚠️ ${pageConfig.name} warming failed: ${errorMsg}`);
      warmingState.memoryProfile.failed.push(pageConfig.name);

      // For AI-heavy pages, this is expected in memory-constrained environments
      if (pageConfig.priority === "heavy") {
        console.log(
          `   📝 ${pageConfig.name} failure recorded - AI pages may need individual warming`
        );
      }
    }
  }

  // Save warming state to disk
  const stateDir = path.join(__dirname, "../../results");
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const statePath = path.join(stateDir, "warming-state.json");
  fs.writeFileSync(statePath, JSON.stringify(warmingState, null, 2));

  console.log("💾 Warming state saved to:", statePath);
  console.log(
    "🎯 Enhanced page warming completed! AI-heavy pages ready for individual testing."
  );

  // Performance validation with enhanced memory
  console.log("⚡ Enhanced performance validation...");
  try {
    const perfStart = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
    const perfTime = Date.now() - perfStart;
    console.log(`✅ Post-warming performance: ${perfTime}ms`);
  } catch {
    console.log("⚠️ Performance test failed, but warming data preserved");
  }

  await context.close();
  await browser.close();
}

export default globalSetup;
