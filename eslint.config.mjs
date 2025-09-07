// Enhanced ESLint flat config (Next.js aware) with resilient fallback.
// Minimal parse-only pass, but load plugins so inline disable directives don't error.
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

// Minimal Next lint config to prevent crashes from eslint-config-next/@rushstack patch.
// We rely on the primary repo lint (eslint.flat.mjs) for real rules. This pass only parses files.
export default [
  // Global ignores first to avoid scanning build artifacts and config files
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.firebase/**",
      "**/out/**",
      "**/dist/**",
      "artifacts/**",
      "coverage/**",
      "playwright/.cache/**",
      "playwright-report/**",
      "eslint.flat.mjs",
      "eslint.config.mjs",
      "**/next.config*.{js,mjs,ts}",
      "serviceAccount.json",
      "scripts/legacy-eslint/**",
    ],
  },
  // Include Next.js plugin via its flat config so Next build detects it.
  // Prefer coreWebVitals; fall back to recommended if unavailable.
  ...(nextPlugin.flatConfig?.coreWebVitals
    ? [nextPlugin.flatConfig.coreWebVitals]
    : nextPlugin.flatConfig?.recommended
      ? [nextPlugin.flatConfig.recommended]
      : []),
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    // Keep this pass resilient: ignore inline config comments that may reference
    // rules not loaded here (e.g., disable/enable of plugin rules). Our primary
    // repo lint (eslint.flat.mjs) enforces those. This avoids
    // "Definition for rule 'x' was not found" during parse-only.
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      // Note: Next.js plugin is provided by the flat config above. Do not redefine it here.
    },
    rules: {},
  },
];
