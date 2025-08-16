import { chromium, FullConfig } from "@playwright/test";
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

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
    console.log(`🌐 Warming up / ensuring server at ${baseUrl}...`);

    // Preflight quick check (HEAD) via fetch to avoid launching browser navigation cost
    let serverAvailable = false;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(baseUrl, { signal: controller.signal }).catch(() => undefined);
      clearTimeout(t);
      if (res && res.ok) serverAvailable = true;
    } catch { /* ignore */ }

    // If not available attempt to spawn dev server (once)
    if (!serverAvailable) {
      if (process.env.DISABLE_SPAWN_DEV) {
        console.log('⏭️  Dev spawn disabled via DISABLE_SPAWN_DEV; will rely on external server.');
      } else {
        console.log('🚀 Dev server not detected, spawning "npm run dev-no-turbopack"...');
        const devProc = spawn('npm', ['run', 'dev-no-turbopack'], {
          cwd: process.cwd(),
          env: { ...process.env },
          stdio: 'inherit',
          detached: true
        });
        // Detach so Playwright process does not wait on it; record pid for possible teardown/debug
        try {
          devProc.unref();
        } catch { /* ignore */ }
        // Only record PID after a brief delay and confirming port responds to avoid stale PID on immediate exit.
        const pidFileDir = path.resolve(process.cwd(), 'test-results');
        const pidFile = path.join(pidFileDir, '.dev-server.json');
        await new Promise(r => setTimeout(r, 2500));
        let postSpawnOk = false;
        try {
          const controller2 = new AbortController();
          const t2 = setTimeout(() => controller2.abort(), 2000);
          const probe = await fetch(baseUrl, { signal: controller2.signal }).catch(() => undefined);
          clearTimeout(t2);
          postSpawnOk = !!(probe && probe.ok);
        } catch { /* ignore */ }
        if (postSpawnOk) {
          try {
            if (!fs.existsSync(pidFileDir)) fs.mkdirSync(pidFileDir, { recursive: true });
            fs.writeFileSync(pidFile, JSON.stringify({ pid: devProc.pid, spawnedAt: new Date().toISOString() }, null, 2));
            console.log(`📝 Recorded spawned dev server PID ${devProc.pid} at ${pidFile}`);
          } catch (e) {
            console.warn('⚠️ Failed to record dev server PID:', (e as Error).message);
          }
        } else {
          console.warn('⚠️ Dev server spawn did not respond; PID not recorded.');
        }
        // Give initial compile head start
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    // Wait for the server to be ready and warm up key pages
    const maxRetries = 15; // allow a bit more time after on-demand spawn
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
        const response = await page.goto(baseUrl, {
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
            } catch (error) {
              console.log(
                `   ⚠️  ${path} not available (this is OK if not implemented yet)`
              );
            }
          }

          // Attempt programmatic login once to persist authenticated storage for later tests
          try {
            const loginPage = await context.newPage();
            await loginPage.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await loginPage.fill('#email', process.env.TEST_ADMIN_EMAIL || 'admin@rankpilot.com');
            await loginPage.fill('#password', process.env.TEST_ADMIN_PASSWORD || 'admin123');
            await Promise.all([
              loginPage.waitForURL(/dashboard|finance|app/, { timeout: 20000 }).catch(() => { }),
              loginPage.press('#password', 'Enter')
            ]);
            await loginPage.waitForTimeout(1000);
            const storagePath = process.env.PLAYWRIGHT_STORAGE || 'test-results/.auth/admin.json';
            const fs = await import('fs');
            const path = await import('path');
            const dir = path.dirname(storagePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            await context.storageState({ path: storagePath });
            console.log(`🗄️  Saved authenticated storage state to ${storagePath}`);
            await loginPage.close();
          } catch (e) {
            console.warn('⚠️  Auth storage state capture failed (continuing):', e instanceof Error ? e.message : e);
          }
          console.log("🎯 Server warmup complete!");

          // Seed minimal kpiDaily doc (only if Firestore emulator or dev; silently ignore errors)
          try {
            if (!process.env.TEST_SKIP_KPI_SEED) {
              const seedResp = await fetch(`${baseUrl}/api/health`);
              // Only attempt Firestore write if local dev (localhost) and health endpoint reachable
              if (baseUrl.includes('localhost') && seedResp.ok) {
                await fetch(`${baseUrl}/api/dev/seed-kpi-daily`, { method: 'POST' }).catch(() => { });
              }
            }
          } catch { /* ignore seed errors */ }
          break;
        }
      } catch (error) {
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
