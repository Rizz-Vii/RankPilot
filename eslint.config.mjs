// Enhanced ESLint config with Next.js plugin
import next from 'eslint-config-next';
import { rule as noSelfReexport } from './scripts/eslint-rules/no-self-reexport.js';
import { rule as noRawHexColors } from './scripts/eslint-rules/no-raw-hex-colors.js';

export default [
  next,
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/out/**"],
    plugins: {
      'custom-rules': { rules: { 'no-self-reexport': noSelfReexport, 'no-raw-hex-colors': noRawHexColors } }
    },
    rules: {
      'custom-rules/no-self-reexport': 'error',
      'custom-rules/no-raw-hex-colors': 'warn',
      // Temporary guard: prevent committing raw service account credentials
      // This leverages ESLint's built-in no-restricted-files pattern via overrides when file matches.
    }
  },
  {
    files: ["serviceAccount.json"],
    rules: {
      // Always fail if this file exists in repo root
      'no-restricted-syntax': ['error', { selector: 'Program', message: 'serviceAccount.json must not be committed. Replace with serviceAccount.example.json and use GOOGLE_APPLICATION_CREDENTIALS env.' }]
    }
  }
  ,{
    files: ["src/components/dashboard/*-chart.js", "src/components/dashboard/seo-score-trend.js"],
    rules: {
      'no-restricted-syntax': ['error', { selector: 'Program', message: 'Deprecated stub file – delete and import the .tsx directly.' }]
    }
  }
];
