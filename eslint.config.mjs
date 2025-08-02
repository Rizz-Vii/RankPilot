import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

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
        // Node.js globals
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        // Web APIs available in Node.js
        URL: "readonly",
        URLSearchParams: "readonly",
        // Firebase admin SDK globals
        FirebaseFirestore: "readonly",
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
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        btoa: "readonly",
        atob: "readonly",
        Image: "readonly",
        performance: "readonly",
        confirm: "readonly",
        // Node.js globals for Next.js and testing utilities
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        // TypeScript globals
        NodeJS: "readonly",
        React: "readonly",
        // Testing globals (Playwright, Jest, etc.)
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
        jest: "readonly",
        // Firebase admin SDK globals
        FirebaseFirestore: "readonly",
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: {
          jsx: true,
        },
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
      "no-unused-vars": "off", // Turn off base rule
      "no-undef": "error", // Keep this for proper global checking
      "no-redeclare": "warn", // Function overloads are common in TS
      "no-case-declarations": "warn", // Switch case declarations
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
