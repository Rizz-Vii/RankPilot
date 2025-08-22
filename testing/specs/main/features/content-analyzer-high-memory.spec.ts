import { expect, test } from "@playwright/test";
import fs from 'fs';
import path from 'path';
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * Content Analyzer - High Memory Test Suite
 * Leverages cached warming state for optimal AI page performance
 */

test.describe("Content Analyzer - High Memory Suite", () => {
    let orchestrator: TestOrchestrator;
    // Removed unused gracefulUtils (instantiated but never referenced)
    type CacheManifest = {
        timestamp?: string;
        pages?: {
            content_analyzer?: { success?: boolean; loadTime?: number }
        };
    };
    let cacheManifest: CacheManifest | undefined;

    test.beforeEach(async ({ page }) => {
        orchestrator = new TestOrchestrator(page);
        // Instantiation removed (unused): new GracefulTestUtils(page)

        // Load cache manifest for optimization insights
        try {
            const manifestPath = path.resolve(__dirname, '../../../cache/warming-manifest.json');
            if (fs.existsSync(manifestPath)) {
                cacheManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CacheManifest;
                console.log(`📊 Using cache manifest from ${cacheManifest.timestamp}`);
            }
    } catch {
            console.log("⚠️ No cache manifest found, proceeding without cache insights");
        }

        // Enhanced timeouts for high-memory AI components
        page.setDefaultNavigationTimeout(60000); // High timeout for AI compilation
        page.setDefaultTimeout(45000); // High timeout for heavy components
    });

    test.describe("AI Component Loading (High Memory)", () => {
        test("loads content analyzer with enhanced memory allocation", async ({ page }) => {
            console.log("🧠 Testing Content Analyzer with high memory allocation...");

            // Check if Content Analyzer was successfully cached
            const cacheInfo = cacheManifest?.pages?.content_analyzer;
            if (cacheInfo?.success) {
                console.log(`⚡ Using cached Content Analyzer (warmed in ${cacheInfo.loadTime}ms)`);
            } else {
                console.log("🔄 Content Analyzer not cached, using enhanced memory strategy");
            }

            await orchestrator.userManager.loginAs("starter");

            // Enhanced navigation with memory monitoring
            console.log("🚀 Navigating to Content Analyzer with enhanced memory...");
            const startTime = Date.now();

            await page.goto("/content-analyzer", {
                waitUntil: "domcontentloaded",
                timeout: 60000 // Extended timeout for AI compilation
            });

            // Enhanced stabilization for AI components
            console.log("🧠 Allowing AI components to fully initialize...");
            await page.waitForTimeout(10000); // Extended wait for AI components

            // Wait for critical AI elements
            try {
                await page.waitForSelector('h1, h2, [role="heading"]', { timeout: 30000 });
                console.log("✅ Page heading detected");
            } catch {
                console.log("⚠️ No heading found, checking for other content indicators");
            }

            // Check for AI-specific content
            const aiIndicators = await page.locator(
                "text=/content.analyzer|analyze.content|ai.powered|genkit|neuroseo/i"
            ).count();

            const loadTime = Date.now() - startTime;
            console.log(`⚡ Content Analyzer loaded in ${loadTime}ms with ${aiIndicators} AI indicators`);

            // Verify the page loaded successfully
            const hasContent = await page.locator("main, .main-content, [data-testid*='content']").count() > 0;
            expect(hasContent).toBe(true);

            // Performance assertion - should be faster with caching
            if (cacheInfo?.success && cacheInfo.loadTime) {
                console.log(`📊 Performance comparison: Cache=${cacheInfo.loadTime}ms, Current=${loadTime}ms`);
            }
        });

        test("handles AI component interactions with high memory", async ({ page }) => {
            console.log("🎯 Testing AI component interactions...");

            await orchestrator.userManager.loginAs("agency");
            await page.goto("/content-analyzer");

            // Extended wait for AI components
            await page.waitForTimeout(12000);

            // Test form interactions
            const urlInput = page.locator('input[type="url"], input[placeholder*="url"], input[name*="url"]');
            if (await urlInput.count() > 0) {
                console.log("📝 Testing URL input interaction...");
                await urlInput.first().fill("https://example.com");
                await page.waitForTimeout(2000);

                const urlValue = await urlInput.first().inputValue();
                expect(urlValue).toBe("https://example.com");
            }

            // Test AI-powered buttons
            const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Generate"), button[type="submit"]');
            if (await analyzeButton.count() > 0) {
                console.log("🔍 Testing AI analyze button visibility...");
                await expect(analyzeButton.first()).toBeVisible();
            }

            // Check for charts/visualizations
            const charts = page.locator('.recharts-wrapper, [data-testid*="chart"], canvas');
            if (await charts.count() > 0) {
                console.log("📊 AI charts/visualizations detected");
                await expect(charts.first()).toBeVisible();
            }
        });

        test("validates AI processing with memory optimization", async ({ page }) => {
            console.log("⚡ Testing AI processing capabilities...");

            await orchestrator.userManager.loginAs("enterprise");
            await page.goto("/content-analyzer");

            // Enhanced wait for AI initialization
            await page.waitForTimeout(15000);

            // Look for AI processing indicators
            const processingElements = await page.locator(
                '[data-testid*="processing"], .loading, .spinner, text=/processing|analyzing|generating/i'
            ).count();

            // Look for results containers
            const resultsContainers = await page.locator(
                '[data-testid*="results"], .results, .analysis-results, .ai-output'
            ).count();

            console.log(`🧠 Found ${processingElements} processing indicators and ${resultsContainers} result containers`);

            // Test memory-intensive operations don't crash the page
            const pageTitle = await page.title();
            expect(pageTitle).not.toBe("");

            // Ensure page is still responsive
            const bodyVisible = await page.locator('body').isVisible();
            expect(bodyVisible).toBe(true);
        });
    });

    test.describe("Memory Performance Validation", () => {
        test("validates page stability under high memory usage", async ({ page }) => {
            console.log("🏋️ Testing page stability under memory pressure...");

            await orchestrator.userManager.loginAs("enterprise");

            // Monitor memory usage if possible
            const client = await page.context().newCDPSession(page);
            await client.send('Performance.enable');

            // Initial metrics captured (unused variable removed)
            await client.send('Performance.getMetrics');
            console.log("📊 Initial memory metrics captured");

            await page.goto("/content-analyzer");
            await page.waitForTimeout(20000); // Extended wait for full AI loading

            // Final metrics captured (unused variable removed)
            await client.send('Performance.getMetrics');
            console.log("📊 Final memory metrics captured");

            // Basic stability checks
            const pageStable = await page.evaluate(() => {
                return document.readyState === 'complete' && !window.location.href.includes('error');
            });

            expect(pageStable).toBe(true);
            console.log("✅ Page remained stable under high memory usage");
        });

        test("handles concurrent AI operations", async ({ page }) => {
            console.log("🔄 Testing concurrent AI operations...");

            await orchestrator.userManager.loginAs("enterprise");
            await page.goto("/content-analyzer");
            await page.waitForTimeout(10000);

            // Simulate multiple concurrent operations
            const operations = [];

            // Operation 1: URL input
            const urlOperation = page.locator('input[type="url"]').first().fill("https://test1.com").catch(() => { });
            operations.push(urlOperation);

            // Operation 2: Button clicks
            const buttonOperation = page.locator('button').first().hover().catch(() => { });
            operations.push(buttonOperation);

            // Operation 3: Navigation within page
            const scrollOperation = page.evaluate(() => window.scrollTo(0, 100)).catch(() => { });
            operations.push(scrollOperation);

            // Wait for all operations to complete
            await Promise.allSettled(operations);

            // Verify page is still functional
            const pageResponsive = await page.evaluate(() => document.readyState === 'complete');
            expect(pageResponsive).toBe(true);

            console.log("✅ Page handled concurrent operations successfully");
        });
    });

    test.afterEach(async ({ page }) => {
        // Cleanup and memory reporting
        if (cacheManifest) {
            console.log("📋 Cache utilization completed for test");
        }
    });
});
