// Intentionally empty CJS flat-config. Real config lives in eslint.flat.mjs and eslint.config.mjs.
module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/out/**",
      "artifacts/**",
      "coverage/**",
    ],
  },
];
