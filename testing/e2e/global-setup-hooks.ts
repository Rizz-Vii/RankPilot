import type { FullConfig } from "@playwright/test";
import { chromium, firefox, webkit } from "@playwright/test";
import { logE2EError } from "./hooks/error-logger";

/**
 * Global setup that validates base URL availability and wires basic network probes.
 * Note: Playwright's recommended global fixtures are per-test; we add lightweight checks here.
 */
export default async function globalSetupHooks(config: FullConfig) {
  const baseURL =
    (config.projects[0]?.use as any)?.baseURL ||
    process.env.TEST_BASE_URL ||
    "http://localhost:3000";
  const browsers = [chromium, firefox, webkit];

  for (const engine of browsers) {
    const browser = await engine.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Console and page error listeners
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        logE2EError("console.error", { text: msg.text(), url: page.url() });
      }
    });
    page.on("pageerror", (err) => {
      logE2EError("pageerror", { error: String(err), url: page.url() });
    });
    page.on("requestfailed", (req) => {
      logE2EError("requestfailed", {
        url: req.url(),
        failure: req.failure(),
        method: req.method(),
      });
    });

    try {
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
    } catch (e) {
      logE2EError("globalSetupHooks:navigate-failed", {
        baseURL,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      await browser.close();
    }
  }
}
