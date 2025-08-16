import { defineConfig, devices } from "@playwright/test";
import fs from 'fs';
const storageStatePath = process.env.PLAYWRIGHT_STORAGE || 'test-results/.auth/admin.json';
const hasStorage = fs.existsSync(storageStatePath);
import { getProxyConfig } from "./testing/specs/main/utils/proxy";

export default defineConfig({
  // Expanded to cover both main and organized spec directories (for contract + feature acceptance specs)
  testDir: "./testing/specs",
  timeout: 60000, // Increased timeout for complex flows
  retries: process.env.CI ? 2 : 1,
  // Global worker limit to prevent server crashes
  workers: 1, // Force single worker for server stability
  fullyParallel: false, // Ensure sequential execution
  reporter: [
    ["html"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
    ["json", { outputFile: "test-results/test-results.json" }],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20000,
    navigationTimeout: 20000,
    storageState: hasStorage ? storageStatePath : undefined,
  },
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
      threshold: 0.2,
      animations: "disabled",
    },
  },
  outputDir: "test-results/",
  snapshotDir: "test-snapshots/",

  // Role-based worker configuration
  projects: [
    // FREE TIER WORKER - Tests for free users with basic functionality
    {
      name: "free-tier-worker",
      testMatch: ["**/role-based/**/*free*.spec.ts", "**/navigation/**/*.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        proxy: getProxyConfig(),
        // Custom context for free tier testing
        contextOptions: {
          extraHTTPHeaders: {
            "X-Test-User-Role": "free",
            "X-Test-Worker": "free-tier",
          },
        },
      },
      // Sequential execution for free tier tests
      fullyParallel: false,
      // Single worker to ensure sequential flow
      workers: 1,
      metadata: {
        userRole: "free",
        description: "Tests basic functionality available to free tier users",
      },
    },

    // ENTERPRISE/ADMIN TIER WORKER - Tests for premium users with advanced functionality
    {
      name: "enterprise-tier-worker",
      testMatch: "**/role-based/**/*enterprise*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        proxy: getProxyConfig(),
        // Custom context for enterprise tier testing
        contextOptions: {
          extraHTTPHeaders: {
            "X-Test-User-Role": "enterprise",
            "X-Test-Worker": "enterprise-tier",
          },
        },
      },
      // Sequential execution for enterprise tier tests
      fullyParallel: false,
      // Single worker to ensure sequential flow
      workers: 1,
      metadata: {
        userRole: "enterprise",
        description:
          "Tests advanced functionality available to enterprise/admin users",
      },
    },

    // CROSS-BROWSER TESTING (Secondary priority)
    {
      name: "firefox-compatibility",
      testMatch: "**/compatibility/**/*.spec.ts",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 },
      },
      // Only run if role-based tests pass
      dependencies: ["free-tier-worker", "enterprise-tier-worker"],
    },

    // MOBILE TESTING (Integrated with role-based testing)
    {
      name: "mobile-free-tier",
      testMatch: "**/mobile/**/*free*.spec.ts",
      use: {
        ...devices["iPhone 12"],
        contextOptions: {
          extraHTTPHeaders: {
            "X-Test-User-Role": "free",
            "X-Test-Device": "mobile",
          },
        },
      },
      fullyParallel: false,
      workers: 1,
    },

    {
      name: "mobile-enterprise-tier",
      testMatch: "**/mobile/**/*enterprise*.spec.ts",
      use: {
        ...devices["iPhone 12"],
        contextOptions: {
          extraHTTPHeaders: {
            "X-Test-User-Role": "enterprise",
            "X-Test-Device": "mobile",
          },
        },
      },
      fullyParallel: false,
      workers: 1,
    },

    // VISUAL REGRESSION TESTING
    {
      name: "visual-regression",
      testMatch: "**/visual/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
      // Run visual tests after functional tests
      dependencies: ["free-tier-worker", "enterprise-tier-worker"],
    },

    // API CONTRACT TESTING (Independent)
    {
      name: "api-testing",
      testMatch: "**/api/**/*.spec.ts",
      use: {
        baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
        extraHTTPHeaders: {
          "X-Test-Type": "api",
        },
      },
    },

    // ACCESSIBILITY TESTING
    {
      name: "accessibility",
      testMatch: "**/accessibility/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ["free-tier-worker"],
    },

    // LEGACY TESTS (Gradual migration)
    {
      name: "legacy-tests",
      testMatch: [
        "**/performance.spec.ts",
        "**/auth/*.spec.ts",
        "**/auth-consolidated.spec.ts",
        "**/mobile-nav-consolidated.spec.ts",
        "**/features/**/*.spec.ts",
        "**/public-pages-e2e.spec.ts",
        // Include organized specs (health-ai-usage-contract, observability smoothing, etc.)
        "**/organized/**/*.spec.ts",
        // Admin area (observability, etc.) gradually migrating
        "**/admin/observability-*.spec.ts"
        , "**/admin/observability-alert-history.spec.ts"
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        proxy: getProxyConfig(),
      },
      // Sequential execution to prevent server crashes
      fullyParallel: false,
      // Single worker to ensure server stability
      workers: 1,
    },
  ],

  // Global setup and teardown
  globalSetup: "./testing/specs/main/global-setup.ts",
  globalTeardown: "./testing/specs/main/global-teardown.ts",

  // Environment-specific configurations
  ...(process.env.CI && {
    // CI-specific settings - FORCE SINGLE WORKER FOR STABILITY
    workers: 1, // Fixed: was 2, causing server crashes
    retries: 3,
    use: {
      trace: "on-first-retry",
      video: "retain-on-failure",
    },
  }),

  // Only auto-start a dev server if we are not pointing at an existing base URL
  // and the caller hasn't explicitly opted out via SKIP_WEB_SERVER.
  ...(
    process.env.NODE_ENV === "development" &&
    !process.env.TEST_BASE_URL &&
    !process.env.SKIP_WEB_SERVER && {
      // Development-specific settings - FORCE SINGLE WORKER FOR STABILITY
      workers: 1, // Fixed: was 2, causing server crashes
      webServer: {
        command: "npm run dev-no-turbopack", // Use stable dev server
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
    }
  ),
});
