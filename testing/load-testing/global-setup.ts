import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
    console.log("🚀 Production Test Suite Global Setup");

    // Warm up the production servers
    console.log("⏳ Warming up production servers...");

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Warm up main app (performance testing environment)
        await page.goto("https://rankpilot-h3jpc--performance-testing-mw0cwov5.web.app", { waitUntil: "networkidle" });
        console.log("✅ Performance testing app warmed up");

        // Warm up functions
        await page.goto("https://australia-southeast2-rankpilot-h3jpc.cloudfunctions.net/api/health", {
            waitUntil: "networkidle"
        });
        console.log("✅ Firebase Functions warmed up");

        console.log("🎯 Performance testing environment ready");

    } catch (_error) {
        console.warn("⚠️ Server warmup encountered issues:", error instanceof Error ? error.message : String(_error));
    } finally {
        await browser.close();
    }
}

export default globalSetup;
