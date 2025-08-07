// Enhanced ESLint config with Next.js plugin
import next from 'eslint-config-next';

export default [
  next,
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/out/**"],
  },
];
