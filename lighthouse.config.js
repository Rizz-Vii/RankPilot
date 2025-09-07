// Allow overriding the Lighthouse target via env for PR previews/staging
const base =
  process.env.PERFORMANCE_URL ||
  "https://rankpilot-h3jpc--performance-testing-mw0cwov5.web.app";

module.exports = {
  ci: {
    collect: {
      url: [
        `${base}/`,
        `${base}/dashboard`,
        `${base}/audit`,
        `${base}/login`,
        `${base}/register`,
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags:
          "--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --headless --disable-gpu --remote-debugging-port=9222 --disable-extensions --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding",
        preset: "desktop",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        auditMode: false,
        gatherMode: false,
        disableStorageReset: false,
        emulatedUserAgent: false,
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.85 }],
        "categories:seo": ["warn", { minScore: 0.85 }],

        // Core Web Vitals assertions
        "first-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "first-input-delay": ["error", { maxNumericValue: 100 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],

        // Performance budget assertions
        "speed-index": ["warn", { maxNumericValue: 3000 }],
        interactive: ["warn", { maxNumericValue: 3800 }],

        // Resource efficiency
        "uses-optimized-images": "warn",
        "uses-webp-images": "warn",
        "efficient-animated-content": "warn",
        "unused-css-rules": "warn",
        "unused-javascript": "warn",

        // Accessibility requirements (WCAG 2.1 AA)
        "color-contrast": "error",
        "heading-order": "error",
        "link-name": "error",
        "button-name": "error",
        "image-alt": "error",
        "form-field-multiple-labels": "error",
        "frame-title": "error",

        // Mobile performance
        viewport: "error",
        "font-size": "error",
        "tap-targets": "error",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
    server: {
      port: 9001,
      storage: "./lighthouse-reports",
    },
  },
};
