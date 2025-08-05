import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/.firebase/**",
      "**/backups/**",
      "**/.typescript-guardian-backups/**",
      "**/docs-backup-*/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  // Legacy config support (example, add more as needed)
  ...compat.extends("plugin:import/typescript"),
  {
    // Node.js JavaScript files (including Firebase Functions)
    files: [
      "**/functions/**/*.js",
      "**/*.mjs",
      "**/cache-handler.js",
      "**/validation-*.js",
      "**/verify-*.js",
      "**/test-*.js",
      "**/fix-*.js",
      "**/comprehensive-*.mjs",
      "**/enhanced-*.mjs",
      "**/final-*.mjs",
      "**/typescript-guardian-*.mjs",
      "**/pilotScripts/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        // Add custom globals if needed
        FirebaseFirestore: "readonly",
        NodeJS: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "prefer-const": "warn",
      "no-var": "error",
      "no-console": "off",
      "no-undef": "error",
    },
  },
  // Functions/src TypeScript files (use functions/tsconfig.json)
  {
    files: ["functions/src/**/*.ts", "functions/src/**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: path.resolve(__dirname, "./functions/tsconfig.json"),
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
        NodeJS: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "prefer-const": "warn",
      "no-var": "error",
      "no-console": "off",
      "no-debugger": "warn",
      "no-unused-vars": "off",
      "no-undef": "error",
      "no-redeclare": "warn",
      "no-case-declarations": "warn",
    },
  },
  // Main src TypeScript files (use root tsconfig.json)
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: path.resolve(__dirname, "./tsconfig.json"),
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        // Add custom browser globals if needed
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "prefer-const": "warn",
      "no-var": "error",
      "no-console": "off",
      "no-debugger": "warn",
      "no-unused-vars": "off",
      "no-undef": "error",
      "no-redeclare": "warn",
      "no-case-declarations": "warn",
    },
  },
  {
    files: ["**/*.{js,jsx}"],
    rules: {
      "no-unused-vars": "warn",
      "prefer-const": "warn",
      "no-var": "error",
      "no-console": "off",
    },
  },
  // Jest test files
  {
    files: ["**/*.test.{js,ts,jsx,tsx}", "**/*.spec.{js,ts,jsx,tsx}"],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      // Optionally add Jest-specific rules here
    },
  },
  {
    // Service Worker specific configuration
    files: ["**/sw.js", "**/service-worker.js", "**/public/sw.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Service Worker globals
        self: "readonly",
        caches: "readonly",
        clients: "readonly",
        skipWaiting: "readonly",
        importScripts: "readonly",
        // Web APIs available in Service Workers
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        location: "readonly",
        navigator: "readonly",
        window: "readonly", // Available in some contexts
        // Response and Request APIs
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        // Storage APIs
        indexedDB: "readonly",
        // Crypto API
        crypto: "readonly",
        // Performance API
        performance: "readonly",
        // Encoding APIs
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        atob: "readonly",
        btoa: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "prefer-const": "warn",
      "no-var": "error",
      "no-console": "off",
      "no-undef": "error",
    },
  },
];
