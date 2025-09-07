import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("🧪 Testing Environment Setup");

  // Warm up the testing servers
  console.log("⏳ Warming up testing environment...");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Warm up testing app
    await page.goto("https://rankpilot-h3jpc.web.app", {
      waitUntil: "networkidle",
    });
    console.log("✅ Testing app warmed up");

    // Warm up functions (same endpoint)
    await page.goto("https://rankpilot-h3jpc.web.app/api/health", {
      waitUntil: "networkidle",
    });
    console.log("✅ Firebase Functions warmed up");

    console.log("🎯 Testing environment ready");
  } catch (error) {
    console.warn(
      "⚠️ Testing environment warmup issues:",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
