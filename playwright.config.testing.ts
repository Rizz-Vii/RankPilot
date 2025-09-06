import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./testing/load-testing",
    timeout: 120000, // 2 minutes for testing environment
    workers: process.env.CI ? 1 : 2,
    reporter: [
        ["html", { outputFolder: "test-results/testing-html" }],
        ["junit", { outputFile: "test-results/testing-junit.xml" }],
        ["line"],
    ],
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.TEST_BASE_URL || "https://rankpilot-h3jpc--performance-testing-mw0cwov5.web.app",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        actionTimeout: 30000,
        navigationTimeout: 60000,
    },
    expect: {
        timeout: 15000,
    },
    outputDir: "test-results/testing/",

    projects: [
        {
            name: "testing-chrome",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "testing-firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "testing-mobile",
            use: { ...devices["iPhone 13"] },
        },
    ],

    // Global setup/teardown: reuse main to avoid missing files
    globalSetup: require.resolve("./testing/specs/main/global-setup.ts"),
    globalTeardown: require.resolve("./testing/specs/main/global-teardown.ts"),
});
