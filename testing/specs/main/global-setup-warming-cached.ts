/**
 * Global Setup with Enhanced Caching & State Preservation
 * Saves warmed state for subsequent high-memory AI tests
 */

import { chromium, FullConfig } from "@playwright/test";
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
    console.log("🌟 Starting Enhanced RankPilot Test Suite with State Caching...");

    // Ensure cache directories exist
    const cacheDir = path.resolve(__dirname, '../../../testing/cache');
    const resultsDir = path.resolve(__dirname, '../../../testing/results/high-memory');

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const browser = await chromium.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--memory-pressure-off',
            '--max_old_space_size=6144',
            '--js-flags="--max-old-space-size=6144"',
            '--aggressive-cache-discard',
            '--enable-precise-memory-info',
        ]
    });

    const context = await browser.newContext({
        // Enhanced context for caching
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Check if dev server is running
    const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

    try {
        console.log("🔍 Checking development server...");
        await page.goto(baseURL, { timeout: 15000 });
        console.log("✅ Development server is running");
    } catch (_error) {
        console.log("❌ Development server not running. Please start with: npm run dev-no-turbopack");
        throw new Error("Development server not available");
    }

    // Pre-authenticate and save storage state
    console.log("🔐 Pre-authenticating and caching state...");
    try {
        await page.goto(`${baseURL}/login`);
        await page.fill('#email', 'starter.user1@test.com');
        await page.fill('#password', 'TestPass123!');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 30000 });
        console.log("✅ Authentication successful - saving state");

        // Save authentication state for reuse
        await context.storageState({ path: path.join(cacheDir, 'warmed-storage-state.json') });
    } catch (_error) {
        console.log("⚠️ Authentication failed, continuing with warming...");
    }    // Define enhanced warming sequence with state tracking
    const warmingSequence = [
        // Light pages (build base cache)
        { path: "/", name: "Homepage", timeout: 15000, priority: "light", cacheKey: "home" },
        { path: "/login", name: "Login", timeout: 10000, priority: "light", cacheKey: "login" },
        { path: "/register", name: "Register", timeout: 10000, priority: "light", cacheKey: "register" },

        // Medium pages (component cache)
        { path: "/dashboard", name: "Dashboard", timeout: 20000, priority: "medium", cacheKey: "dashboard" },
        { path: "/keyword-tool", name: "Keyword Tool", timeout: 35000, priority: "medium", cacheKey: "keyword" },
        { path: "/performance", name: "Performance", timeout: 25000, priority: "medium", cacheKey: "performance" },

        // Heavy AI pages (full AI cache)
        { path: "/content-analyzer", name: "Content Analyzer", timeout: 60000, priority: "heavy", cacheKey: "content_analyzer" },
        { path: "/neuroseo", name: "NeuroSEO Dashboard", timeout: 45000, priority: "heavy", cacheKey: "neuroseo" },
        { path: "/competitors", name: "Competitors", timeout: 40000, priority: "heavy", cacheKey: "competitors" },
    ];

    const warmingResults = [];
    const cacheManifest = {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        pages: {} as Record<string, any>
    };

    for (const pageConfig of warmingSequence) {
        console.log(`🔄 Warming ${pageConfig.name} (${pageConfig.priority} priority)...`);
        const startTime = Date.now();

        try {
            await page.goto(`${baseURL}${pageConfig.path}`, {
                waitUntil: "domcontentloaded",
                timeout: pageConfig.timeout
            });

            // Enhanced waiting for AI-heavy pages
            if (pageConfig.priority === "heavy") {
                console.log("   ⏳ Allowing AI components to compile and cache...");
                // Wait for AI components to stabilize
                await page.waitForTimeout(8000);

                // Wait for any dynamic content
                try {
                    await page.waitForSelector('[data-testid*="chart"], .recharts-wrapper, [class*="framer-motion"]', {
                        timeout: 15000
                    });
                } catch {
                    // Continue if no charts/animations found
                }
            } else if (pageConfig.priority === "medium") {
                await page.waitForTimeout(3000);
            } else {
                await page.waitForTimeout(1000);
            }

            const loadTime = Date.now() - startTime;
            console.log(`   ✅ ${pageConfig.name} warmed in ${loadTime}ms`);

            warmingResults.push({
                path: pageConfig.path,
                name: pageConfig.name,
                priority: pageConfig.priority,
                loadTime,
                success: true,
                cached: true
            });

            // Save to cache manifest
            cacheManifest.pages[pageConfig.cacheKey] = {
                path: pageConfig.path,
                name: pageConfig.name,
                priority: pageConfig.priority,
                loadTime,
                timestamp: new Date().toISOString(),
                success: true
            };

        } catch (_error) {
            const errorMessage = error instanceof Error ? error.message : String(_error);
            console.log(`   ⚠️ ${pageConfig.name} warming failed: ${errorMessage}`);

            warmingResults.push({
                path: pageConfig.path,
                name: pageConfig.name,
                priority: pageConfig.priority,
                _error: errorMessage,
                success: false,
                cached: false
            });

            cacheManifest.pages[pageConfig.cacheKey] = {
                path: pageConfig.path,
                name: pageConfig.name,
                priority: pageConfig.priority,
                _error: errorMessage,
                timestamp: new Date().toISOString(),
                success: false
            };
        }
    }

    // Save cache manifest
    fs.writeFileSync(
        path.join(cacheDir, 'warming-manifest.json'),
        JSON.stringify(cacheManifest, null, 2)
    );

    // Save warming results for analysis
    fs.writeFileSync(
        path.join(resultsDir, 'warming-results.json'),
        JSON.stringify(warmingResults, null, 2)
    );

    console.log("🎯 Enhanced page warming with caching completed!");
    console.log(`📊 Cache manifest saved with ${Object.keys(cacheManifest.pages).length} pages`);

    const successfulWarms = warmingResults.filter(r => r.success);
    console.log(`✅ Successfully cached: ${successfulWarms.length}/${warmingResults.length} pages`);

    await context.close();
    await browser.close();
}

export default globalSetup;
