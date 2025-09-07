import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

// Extend the primary config with a dedicated mobile-compatibility project alias
export default defineConfig({
    ...baseConfig,
    projects: [
        ...(Array.isArray((baseConfig as any).projects) ? (baseConfig as any).projects : []),
        {
            name: "mobile-compatibility",
            // Focus on mobile UX critical specs
            testMatch: [
                "testing/specs/main/mobile-nav-consolidated.spec.ts",
                "testing/specs/main/public-pages-e2e.spec.ts",
                "testing/specs/main/marketing-landmarks.spec.ts",
            ],
            use: {
                ...devices["Pixel 5"],
                contextOptions: {
                    reducedMotion: "reduce",
                },
            },
        },
    ],
});
