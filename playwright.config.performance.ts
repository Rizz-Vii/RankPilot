import { defineConfig, devices } from "@playwright/test";
import fs from 'fs';
const storageStatePath = process.env.PLAYWRIGHT_STORAGE || 'test-results/.auth/admin.json';
const hasStorage = fs.existsSync(storageStatePath);

export default defineConfig({
    testDir: "./testing/specs",
    timeout: 120000, // 2 minutes for performance tests
    workers: process.env.CI ? 1 : 2,
    reporter: [
        ["html", { outputFolder: "test-results/performance-html" }],
        ["junit", { outputFile: "test-results/performance-junit.xml" }],
        ["line"],
    ],
    use: {
        baseURL: process.env.TEST_BASE_URL || process.env.PERFORMANCE_URL || "https://rankpilot-h3jpc--performance-testing-mw0cwov5.web.app",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        actionTimeout: 30000,
        navigationTimeout: 60000,
        storageState: hasStorage ? storageStatePath : undefined,
    },
    expect: {
        timeout: 15000,
    },
    outputDir: "test-results/performance/",

    projects: [
        {
            name: "performance-critical",
            use: { ...devices["Desktop Chrome"] },
            testMatch: ["**/auth-consolidated.spec.ts", "**/accessibility.spec.ts"],
        },
        {
            name: "performance-mobile",
            use: { ...devices["iPhone 13"] },
            testMatch: ["**/mobile-nav-consolidated.spec.ts"],
        },
        {
            name: "performance-load",
            use: { ...devices["Desktop Chrome"] },
            testMatch: ["**/performance.spec.ts"],
        },
        {
            name: "production-firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "production-mobile",
            use: { ...devices["iPhone 13"] },
        },
    ],

    // Global setup for production testing
    globalSetup: require.resolve("./testing/load-testing/global-setup.ts"),
    globalTeardown: require.resolve("./testing/load-testing/global-teardown.ts"),
});
