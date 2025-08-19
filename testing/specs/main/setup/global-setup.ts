import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import { getProxyConfig, rotateUserAgent } from "../utils/test-utils";

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    userAgent: rotateUserAgent(),
    proxy: getProxyConfig(),
  });

  // Set up authentication state
  if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
    await page.goto(process.env.TEST_BASE_URL + "/login");
    await page.fill('[data-testid="email"]', process.env.TEST_USER_EMAIL);
    await page.fill('[data-testid="password"]', process.env.TEST_USER_PASSWORD);
    await page.click('[data-testid="submit"]');
    await page.waitForURL("**/dashboard");

    // Save signed-in state to 'auth.json'
    await page.context().storageState({ path: "tests/auth.json" });
  }

  await browser.close();
}

export default globalSetup;
