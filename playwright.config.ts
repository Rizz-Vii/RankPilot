import { defineConfig, devices } from "@playwright/test";
// import { getProxyConfig } from "./testing/specs/main/utils/proxy";

export default defineConfig({
  testDir: "./testing",
  timeout: 30000,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
      threshold: 0.2,
      animations: "disabled",
    },
  },
  outputDir: "test-results/",
  snapshotDir: "test-snapshots/",
  projects: [
    // Desktop Browsers
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        // proxy: getProxyConfig(),
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 720 },
      },
    },
    // Mobile Devices
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 13"],
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },
    // Tablet Devices
    {
      name: "tablet",
      use: {
        ...devices["iPad (gen 7)"],
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },
    // Test Type Projects
    {
      name: "accessibility",
      testMatch: "**/?(*.)@(accessibility|a11y).spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "light",
      },
    },
    {
      name: "visual",
      testMatch: "**/?(*.)@(visual|screenshot).spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
