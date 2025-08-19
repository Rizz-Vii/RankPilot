// Enhanced ESLint flat config (Next.js aware) with resilient fallback.
// We explicitly import the rushstack patch so module resolution works when invoking eslint directly.
import next from 'eslint-config-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { rule as noSelfReexport } from './scripts/eslint-rules/no-self-reexport.js';
import { rule as noRawHexColors } from './scripts/eslint-rules/no-raw-hex-colors.js';

// Next config may export an array; normalize.
const base = Array.isArray(next) ? next : [next];

export default [
  ...base.filter(Boolean),
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/out/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'custom-rules': { rules: { 'no-self-reexport': noSelfReexport, 'no-raw-hex-colors': noRawHexColors } }
    },
    rules: {
      'custom-rules/no-self-reexport': 'error',
      'custom-rules/no-raw-hex-colors': 'error'
    }
  },
  {
    files: ["serviceAccount.json"],
    rules: {
      'no-restricted-syntax': ['error', { selector: 'Program', message: 'serviceAccount.json must not be committed. Replace with serviceAccount.example.json and use GOOGLE_APPLICATION_CREDENTIALS env.' }]
    }
  },
  {
    files: ["src/components/dashboard/*-chart.js", "src/components/dashboard/seo-score-trend.js"],
    rules: {
      'no-restricted-syntax': ['error', { selector: 'Program', message: 'Deprecated stub file – delete and import the .tsx directly.' }]
    }
  }
];
