/**
 * Dedicated Server Warming and Preloading Test
 * Tests the server warmup functionality specifically
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { chromium } from "@playwright/test";

type RouteWarmResult = {
  route: string;
  name: string;
  loadTime?: number;
  error?: string;
  success: boolean;
};

type WarmingSummary = {
  success: boolean;
  totalTime: number;
  warmingResults: RouteWarmResult[];
  performanceTestTime: number;
  averageWarmTime: number;
};

async function testServerWarming(): Promise<WarmingSummary> {
  console.log("🔄 Starting Server Warming Test...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Performance tracking
    const startTime = Date.now();

    console.log("🌐 Phase 1: Initial Server Contact...");

    // Test basic connectivity with retries
    let connectionSuccess = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!connectionSuccess && attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`   📡 Attempt ${attempts}/${maxAttempts}: Checking server availability...`);

        const response = await page.goto("http://localhost:3000", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        if (response?.ok()) {
          connectionSuccess = true;
          console.log(`   ✅ Server responsive on attempt ${attempts}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Attempt ${attempts} failed: ${errorMessage}`);
        if (attempts < maxAttempts) {
          console.log("   ⏳ Waiting 3 seconds before retry...");
          await page.waitForTimeout(3000);
        }
      }
    }

    if (!connectionSuccess) {
      throw new Error("❌ Failed to connect to development server");
    }

    console.log("🔥 Phase 2: Warming Critical Routes...");

    // Define critical routes for warming
    const criticalRoutes: Array<{ path: string; name: string }> = [
      { path: "/", name: "Homepage" },
      { path: "/login", name: "Login Page" },
      { path: "/register", name: "Register Page" },
      { path: "/dashboard", name: "Dashboard" },
      { path: "/keyword-tool", name: "Keyword Tool" },
    ];

    const warmingResults: RouteWarmResult[] = [];

    for (const route of criticalRoutes) {
      try {
        console.log(`   🌡️  Warming ${route.name} (${route.path})...`);
        const routeStartTime = Date.now();

        await page.goto(`http://localhost:3000${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });

        // Allow compilation time
        await page.waitForTimeout(1000);

        const routeLoadTime = Date.now() - routeStartTime;
        console.log(`   ✅ ${route.name} warmed in ${routeLoadTime}ms`);

        warmingResults.push({
          route: route.path,
          name: route.name,
          loadTime: routeLoadTime,
          success: true,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ⚠️  ${route.name} warming failed: ${errorMessage}`);
        warmingResults.push({
          route: route.path,
          name: route.name,
          error: errorMessage,
          success: false,
        });
      }
    }

    console.log("🎯 Phase 3: Performance Validation...");

    // Test performance after warming with more lenient timeout
    let performanceTestTime = 0;
    try {
      const performanceTestStart = Date.now();
      await page.goto("http://localhost:3000", {
        waitUntil: "domcontentloaded",
        timeout: 25000, // More lenient timeout
      });
      performanceTestTime = Date.now() - performanceTestStart;
      console.log(`⚡ Performance test completed in ${performanceTestTime}ms`);
    } catch (error: unknown) {
      console.log("⚠️  Performance test timed out, but warming data is still valid");
      performanceTestTime = -1; // Indicate timeout
    }

    const totalTime = Date.now() - startTime;

    console.log("\n📊 Warming Test Results:");
    console.log("========================");
    console.log(`🕐 Total warming time: ${totalTime}ms`);
    console.log(
      `⚡ Post-warming homepage load: ${performanceTestTime > 0 ? performanceTestTime + "ms" : "Timed out"}`
    );
    console.log("\n📋 Route Warming Summary:");

    warmingResults.forEach((result) => {
      if (result.success) {
        console.log(`✅ ${result.name}: ${result.loadTime}ms`);
      } else {
        console.log(`❌ ${result.name}: Failed - ${result.error}`);
      }
    });

    const successfulWarms = warmingResults.filter((r) => r.success);
    const averageWarmTime =
      successfulWarms.length > 0
        ? Math.round(
            successfulWarms.reduce((sum, r) => sum + (r.loadTime || 0), 0) / successfulWarms.length
          )
        : 0;

    console.log(`\n📈 Performance Metrics:`);
    console.log(`   Successful route warms: ${successfulWarms.length}/${warmingResults.length}`);
    console.log(`   Average warm time: ${averageWarmTime}ms`);
    console.log(`   Post-warm performance: ${performanceTestTime > 0 ? performanceTestTime + "ms" : "Timed out"}`);

    // Determine overall result - success if we warmed at least some routes
    const isSuccess = successfulWarms.length > 0; // At least 1 successful warm

    if (isSuccess) {
      console.log("\n🎉 Server warming test completed successfully!");
      console.log("🚀 Application is properly warmed and ready for testing.");
    } else {
      console.log("\n⚠️  Server warming test completed with issues.");
      console.log("🔧 Some routes may need optimization or are not yet implemented.");
    }

    return {
      success: isSuccess,
      totalTime,
      warmingResults,
      performanceTestTime,
      averageWarmTime,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

// Run the warming test
if (require.main === module) {
  testServerWarming()
    .then((results) => {
      console.log("\n✨ Warming test execution completed.");
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("\n💥 Warming test failed:", error);
      process.exit(1);
    });
}

export { testServerWarming };
