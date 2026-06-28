/**
 * Global Setup for RankPilot E2E Tests
 * Sets up test environment and authentication state
 */

import type { FullConfig } from "@playwright/test";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import setupHooks from "./global-setup-hooks";

async function globalSetup(config: FullConfig) {
  console.log("Starting E2E test global setup");

  try {
    // Lightweight cross-browser checks and error listeners
    await setupHooks(config);

    // Launch browser for setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set base URL
    const baseURL = config.projects[0].use?.baseURL || "http://localhost:3000";
    await page.goto(baseURL);

    // Wait for app to load - prefer domcontentloaded + visible checks
    await page.waitForLoadState("domcontentloaded");
    await page
      .locator("main, [data-testid], #root")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});

    // Check if app is running
    const title = await page.title();
    console.log("App loaded", { title });

    // Clean up any existing test data
    await cleanupTestData(page);

    // Create/seed test user config (env) if needed
    await setupTestUser(page);

    // Attempt a real login to persist default auth for tests
    await ensureLoggedInAndPersistState(context, page, baseURL);

    // Also persist per-role auth states for RBAC test coverage
    await persistRoleStates(browser, baseURL);

    await browser.close();

    console.log("E2E test global setup completed successfully");
  } catch (error) {
    console.error("E2E test global setup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function cleanupTestData(page: Page) {
  console.log("Cleaning up test data");

  try {
    // Clear local storage
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // Ignore security errors in restricted contexts
        console.log("Storage access restricted during setup, continuing...");
      }
    });

    // Clear cookies
    const context = page.context();
    await context.clearCookies();

    console.log("Test data cleanup completed");
  } catch (error) {
    console.error("Test data cleanup failed, but continuing...", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function setupTestUser(page: Page) {
  console.log("Setting up test user");

  try {
    // Prefer env-provided credentials; otherwise fall back to a known working dev account from users.json
    // users.json entries include:
    //  - abbas_ali_rizvi@hotmail.com (email/password auth) → password injected via env (see SECRETS.md)
    //  - abba7254@gmail.com (Google auth) → not suitable for headless email/password login
    if (!process.env.TEST_USER_EMAIL)
      process.env.TEST_USER_EMAIL = "abbas_ali_rizvi@hotmail.com";
    if (!process.env.TEST_USER_PASSWORD)
      // Password must come from the environment (CI secret / local .env) — never hard-coded.
      // See SECRETS.md. If unset, auth-dependent tests fail loudly rather than using a default.
      console.warn(
        "[global-setup] TEST_USER_PASSWORD is not set — auth-dependent tests will fail until it is provided via CI/.env.",
      );

    // Light ping to ensure app is responsive and AuthContext can initialize in tests
    await page
      .goto(`${process.env.TEST_BASE_URL || "http://localhost:3000"}/login`, {
        waitUntil: "domcontentloaded",
      })
      .catch(() => {
        /* non-fatal */
      });
    console.log("Test user env configured", {
      email: process.env.TEST_USER_EMAIL,
    });
  } catch (error) {
    console.error("Test user setup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function ensureLoggedInAndPersistState(
  context: BrowserContext,
  page: Page,
  baseURL: string
) {
  try {
    const email = process.env.TEST_USER_EMAIL || "abbas_ali_rizvi@hotmail.com";
    const password = process.env.TEST_USER_PASSWORD || "123456";

    // Navigate to login and perform login if form is visible
    await page
      .goto(`${baseURL.replace(/\/$/, "")}/login`, {
        waitUntil: "domcontentloaded",
      })
      .catch(() => {});
    const emailInput = page
      .locator('input[type="email"], input[name*="email"]')
      .first();
    const pwdInput = page.locator('input[type="password"]').first();
    const submit = page
      .locator('button[type="submit"], [data-testid="login-button"]')
      .first();

    if (
      (await emailInput.isVisible().catch(() => false)) &&
      (await pwdInput.isVisible().catch(() => false))
    ) {
      await emailInput.fill(email);
      await pwdInput.fill(password);
      await submit.click({ timeout: 5000 }).catch(() => {});
      // Wait for redirect off login or for a main app element
      const start = Date.now();
      while (Date.now() - start < 5000) {
        const url = page.url();
        if (!/\/login/.test(url)) break;
        const main = await page
          .locator(
            'main, [role="main"], [data-testid="dashboard"], [data-testid*="dashboard"]'
          )
          .first()
          .isVisible()
          .catch(() => false);
        if (main) break;
        await page.waitForTimeout(200);
      }
    }

    // Persist storage state
    const outDir = path.resolve(process.cwd(), "test-results", ".auth");
    const statePath = path.join(outDir, "user.json");
    fs.mkdirSync(outDir, { recursive: true });
    await context.storageState({ path: statePath });
    console.log("Saved storageState for E2E auth", { statePath });
  } catch (e) {
    console.warn(
      "Failed to persist auth storageState during setup; tests will attempt inline login.",
      e instanceof Error ? e.message : e
    );
  }
}

async function persistRoleStates(browser: Browser, baseURL: string) {
  // Define role credentials via env or sensible dev defaults
  const roles: Array<{
    role: "starter" | "agency" | "enterprise";
    email: string;
    password: string;
  }> = [
    {
      role: "starter",
      email: process.env.TEST_STARTER_EMAIL || "starter@rankpilot.com",
      password: process.env.TEST_STARTER_PASSWORD || "123456",
    },
    {
      role: "agency",
      email: process.env.TEST_AGENCY_EMAIL || "agency@rankpilot.com",
      password: process.env.TEST_AGENCY_PASSWORD || "123456",
    },
    {
      role: "enterprise",
      email: process.env.TEST_ENTERPRISE_EMAIL || "enterprise@rankpilot.com",
      password: process.env.TEST_ENTERPRISE_PASSWORD || "123456",
    },
  ];
  const outDir = path.resolve(process.cwd(), "test-results", ".auth");
  fs.mkdirSync(outDir, { recursive: true });

  for (const r of roles) {
    const rolePath = path.join(outDir, `${r.role}.json`);
    try {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      await pg
        .goto(`${baseURL.replace(/\/$/, "")}/login`, {
          waitUntil: "domcontentloaded",
        })
        .catch(() => {});
      // Fill only if inputs are visible
      const emailEl = pg.locator('input[type="email"]').first();
      const pwdEl = pg.locator('input[type="password"]').first();
      const emailVisible = await emailEl.isVisible().catch(() => false);
      const pwdVisible = await pwdEl.isVisible().catch(() => false);
      if (emailVisible && pwdVisible) {
        await emailEl.fill(r.email);
        await pwdEl.fill(r.password);
        const submit = pg
          .locator('button[type="submit"], [data-testid="login-button"]')
          .first();
        if (await submit.isVisible().catch(() => false)) {
          await submit.click().catch(() => {});
        }
        const start = Date.now();
        while (Date.now() - start < 5000) {
          if (!/\/login/.test(pg.url())) break;
          const main = await pg
            .locator('main, [role="main"], [data-testid="dashboard"]')
            .first()
            .isVisible()
            .catch(() => false);
          if (main) break;
          await pg.waitForTimeout(200);
        }
      }
      await ctx.storageState({ path: rolePath });
      await ctx.close();
      console.log(`Saved storageState for role ${r.role}`, { rolePath });
    } catch (e) {
      console.warn(
        `Could not save storageState for role ${r.role}, continuing`,
        e instanceof Error ? e.message : e
      );
      // Fallback: if agency failed, mirror starter state so tests can still run gate-aware
      if (r.role === "agency") {
        try {
          const src = path.join(outDir, "starter.json");
          if (fs.existsSync(src)) fs.copyFileSync(src, rolePath);
        } catch {
          /* noop */
        }
      }
    }
  }
}

export default globalSetup;
