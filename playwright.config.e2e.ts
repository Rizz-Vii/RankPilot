/**
 * Playwright Configuration for RankPilot E2E Tests
 * Configured for authentication flow and security testing
 */

import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./testing/e2e",

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI and limit local workers to reduce dev server churn. */
  workers: process.env.CI ? 1 : 3,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "retain-on-failure",

    /* Timeout settings */
    actionTimeout: 10000,
    // Increase navigation timeout to accommodate first-time route compilation in dev
    navigationTimeout: 60000,

    /* Ignore HTTPS errors for local development */
    ignoreHTTPSErrors: true,

    // Note: Avoid setting global extraHTTPHeaders here to prevent CORS issues
    // with third-party services (e.g., Stripe, Firebase Identity). If needed,
    // inject headers selectively in tests via route interception for same-origin only.

    /* Use persisted auth state from global setup if available */
    storageState: "test-results/.auth/user.json",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    // Role-specific projects (Chromium only) using persisted storageState
    {
      name: "chromium-starter",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "test-results/.auth/starter.json",
      },
    },
    {
      name: "chromium-agency",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "test-results/.auth/agency.json",
      },
    },
    {
      name: "chromium-enterprise",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "test-results/.auth/enterprise.json",
      },
    },

    // Optional performance suite (env-gated inside spec). Runs on Chromium only.
    {
      name: "performance",
      testMatch: "testing/performance/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev-no-turbopack",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Global test timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Global setup and teardown */
  globalSetup: require.resolve("./testing/e2e/global-setup"),
  globalTeardown: require.resolve("./testing/e2e/global-teardown"),
});
