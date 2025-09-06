// Shim config to satisfy npm scripts that reference playwright.config.role-based.ts
// It simply re-exports the primary Playwright config.
import config from "./playwright.config";
export default config;
