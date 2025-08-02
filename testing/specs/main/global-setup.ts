import { chromium, FullConfig } from "@playwright/test";

/**
 * Global setup to ensure the development server is fully ready
 * This helps prevent test failures due to slow compilation
 */
async function globalSetup(config: FullConfig) {
  console.log("🔄 Setting up test environment...");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Use TEST_BASE_URL if available, otherwise fall back to localhost
    const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
    console.log(`🌐 Warming up the server at ${baseUrl}...`);

    // Wait for the server to be ready and warm up key pages
    const maxRetries = 10;
    let retries = 0;

    // Detect if this is a deployed site for different handling
    const isDeployedSite = baseUrl.includes('web.app') || baseUrl.includes('firebaseapp.com');

    while (retries < maxRetries) {
      try {
        console.log(
          `📡 Attempting to connect (${retries + 1}/${maxRetries})...`
        );

        // For deployed sites, use a simpler wait condition
        const waitCondition = isDeployedSite ? "domcontentloaded" : "networkidle";
        const timeout = isDeployedSite ? 15000 : 30000;

        // Try to load the homepage
        const _response = await page.goto(baseUrl, {
          waitUntil: waitCondition,
          timeout: timeout,
        });

        console.log(`🔍 Response status: ${response?.status()}, URL: ${response?.url()}`);

        if (response?.ok()) {
          console.log("✅ Server is ready!");

          // Pre-compile critical pages to speed up tests
          // For deployed sites, only warm the homepage to avoid routing issues
          const pagesToWarm = isDeployedSite ? ["/"] : ["/", "/login", "/dashboard"];

          console.log("🔥 Pre-compiling critical pages...");
          for (const path of pagesToWarm) {
            try {
              console.log(`   - Warming ${path}...`);
              await page.goto(`${baseUrl}${path}`, {
                waitUntil: "domcontentloaded",
                timeout: 10000, // Shorter timeout for warming
              });
              // Shorter delay for deployed sites
              await page.waitForTimeout(isDeployedSite ? 1000 : 2000);
            } catch (_error) {
              console.log(
                `   ⚠️  ${path} not available (this is OK if not implemented yet)`
              );
            }
          }

          console.log("🎯 Server warmup complete!");
          break;
        }
      } catch (_error) {
        retries++;
        const delay = isDeployedSite ? 2000 : 3000; // Shorter delay for deployed sites
        console.log(`❌ Connection failed (${error}), retrying in ${delay / 1000} seconds...`);
        await page.waitForTimeout(delay);
      }
    }

    if (retries >= maxRetries) {
      throw new Error("Server failed to start properly");
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
