import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";

async function globalSetup(config: FullConfig) {
    console.log("🚀 Production Test Suite Global Setup");

    // Warm up the production servers
    console.log("⏳ Warming up production servers...");

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Warm up main app (performance testing environment)
        await page.goto("https://rankpilot-h3jpc.web.app", { waitUntil: "domcontentloaded" });
        // Ensure primary app shell rendered before proceeding
        await page.locator('main, [data-testid="app-root"], #__next').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });
        console.log("✅ Performance testing app warmed up");

        // Warm up functions
        await page.goto("https://rankpilot-h3jpc.web.app/api/health", {
            waitUntil: "domcontentloaded"
        });
        // Wait for health endpoint to return a stable response
        await page.waitForTimeout(500);
        console.log("✅ Firebase Functions warmed up");

        console.log("🎯 Performance testing environment ready");

    } catch (error) {
        console.warn("⚠️ Server warmup encountered issues:", error instanceof Error ? error.message : String(error));
    } finally {
        await browser.close();
    }
}

export default globalSetup;
