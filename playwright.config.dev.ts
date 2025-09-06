import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    // Include all testing subfolders so dev config can run e2e and load-testing suites
    testDir: "./testing",
    timeout: 90000, // 1.5 minutes for development
    workers: process.env.CI ? 1 : 2,
    reporter: [
        ["html", { outputFolder: "test-results/dev-html" }],
        ["line"],
    ],
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.TEST_BASE_URL || "http://localhost:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        actionTimeout: 20000,
        navigationTimeout: 30000,
    },
    expect: {
        timeout: 10000,
    },
    outputDir: "test-results/dev/",

    projects: [
        {
            name: "dev-chrome",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "dev-mobile",
            use: { ...devices["iPhone 13"] },
        },
    ],

    // Global setup/teardown: reuse main to avoid missing files
    globalSetup: require.resolve("./testing/specs/main/global-setup.ts"),
    globalTeardown: require.resolve("./testing/specs/main/global-teardown.ts"),
});
