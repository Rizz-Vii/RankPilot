// Unified flat ESLint config (future-proof, layered). Avoids rushstack patch & duplicates.
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import { rule as noRawHexColors } from './scripts/eslint-rules/no-raw-hex-colors.js';
import { rule as noSelfReexport } from './scripts/eslint-rules/no-self-reexport.js';

// Lightweight inline rule to block focused tests (describe.only / it.only / test.only) outside allowlist.
const focusedTestRule = {
  meta: { type: 'problem', docs: { description: 'Disallow focused test blocks committed to repo' } },
  create(ctx) {
    const allow = [
      // Allow brain skip/focus patterns inside explicit skip tests directory only if needed.
    ];
    const filename = ctx.getFilename();
    if (allow.some(a => filename.includes(a))) return {};
    function reportIf(node) {
      if (node.type === 'MemberExpression' && node.property && node.property.name === 'only') {
        ctx.report({ node, message: 'Focused test (.only) is not allowed – remove before commit.' });
      }
    }
    return {
      CallExpression(node) {
        // check callee like describe.only / it.only / test.only
        if (node.callee && node.callee.type === 'MemberExpression') {
          const obj = node.callee.object;
          if (obj && obj.type === 'Identifier' && ['describe', 'it', 'test'].includes(obj.name)) {
            reportIf(node.callee);
          }
        }
      }
    };
  }
};

const TEST_GLOBS = [
  '**/testing/**/*.{ts,tsx,js,jsx}',
  '**/tests/**/*.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/*.test.{ts,tsx,js,jsx}'
];

export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/out/**', 'functions/lib/**', 'artifacts/**', 'coverage/**'] },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      globals: {
        // Browser globals
        window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly',
        // Node globals
        process: 'readonly', global: 'readonly', __dirname: 'readonly', __filename: 'readonly', module: 'readonly', require: 'readonly',
        console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': hooks,
      'jsx-a11y': jsxA11y,
      'custom-rules': { rules: { 'no-self-reexport': noSelfReexport, 'no-raw-hex-colors': noRawHexColors, 'no-focused-tests': focusedTestRule } }
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
      'custom-rules/no-self-reexport': 'error',
      'custom-rules/no-raw-hex-colors': ['error', {
        allowPaletteFiles: [
          'src/lib/visualizations/d3-visualization-engine.ts',
          'src/lib/visualizations/chart-export-manager.ts'
        ], allow: ['#FFFFFF', '#fff', '#4F46E5', '#10B981']
      }],
      'custom-rules/no-focused-tests': 'error'
    }
  },
  { // Typed rules (only for app source to limit perf impact)
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json', ecmaVersion: 2022, sourceType: 'module' }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn'
    }
  },
  { // Tests: downgrade certain rules
    files: TEST_GLOBS,
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  { // Node / scripts
    files: ['scripts/**/*.{js,ts}', 'tailwind.config.ts', 'playwright.config.*.ts', 'lighthouse.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off', '@typescript-eslint/no-explicit-any': 'warn' }
  },
  { // Allow CommonJS requires in Node-only JS helpers and Firebase Functions JS utilities
    files: ['cache-handler.js', 'functions/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  },
  { // Functions runtime specifics (allow some flexibility)
    files: ['functions/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  { // Token & palette definition exemptions
    files: ['src/styles/tokens.ts', 'tailwind.config.ts'],
    rules: { 'custom-rules/no-raw-hex-colors': 'off' }
  }
];
