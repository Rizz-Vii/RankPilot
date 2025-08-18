// Minimal flat ESLint config for metrics collection (isolated from Next.js + rushstack patch collisions)
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/out/**',
      'functions/lib/**'
    ]
  },
  {
    files: ['**/*.ts','**/*.tsx','**/*.js','**/*.jsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' }
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', vars: 'all', ignoreRestSiblings: true }],
      '@typescript-eslint/no-require-imports': 'error'
    }
  }
];
