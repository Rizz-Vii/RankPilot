import { defineConfig, devices } from "@playwright/test";
import fs from 'fs';
import { getProxyConfig } from "./testing/specs/main/utils/proxy";
const storageStatePath = process.env.PLAYWRIGHT_STORAGE || 'test-results/.auth/admin.json';
const hasStorage = fs.existsSync(storageStatePath);

export default defineConfig({
  testDir: "./testing",
  // Increase global test timeout for slower dev environment
  timeout: 60000,
  workers: process.env.CI ? 1 : undefined,
  globalSetup: './testing/specs/main/global-setup.ts',
  globalTeardown: './testing/specs/main/global-teardown.ts',
  reporter: [
    ["html"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: hasStorage ? storageStatePath : undefined,
    // Allow longer for actions and navigation in the dev container
    actionTimeout: 30000,
    navigationTimeout: 45000,
  },
  expect: {
    // Give assertions a bit more time on CI / slow machines
    timeout: 10000,
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
        proxy: getProxyConfig(),
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
    // Compatibility aliases used by npm scripts
    {
      name: "legacy-tests",
      testMatch: [
        "testing/specs/main/**/*.spec.ts",
        "testing/specs/organized/**/*.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "api-testing",
      testMatch: [
        "testing/specs/api/**/*.spec.ts",
        "testing/specs/**/?(*.)@(api).spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "visual-regression",
      testMatch: [
        "**/?(*.)@(visual|screenshot).spec.ts",
        "testing/specs/main/visual-regression.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "enterprise-tier-worker",
      testMatch: [
        "testing/specs/main/**/*.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "firefox-compatibility",
      testMatch: [
        "testing/specs/main/**/*.spec.ts",
      ],
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    // Performance tests (opt-in; specs themselves are env-gated via E2E_RUN_PERF)
    {
      name: "performance",
      testMatch: [
        "testing/performance/**/?(*.)spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
