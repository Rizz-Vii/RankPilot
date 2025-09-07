// Compact ESLint config for metrics collection (CJS) avoiding flat-config patch conflicts.
// Relies on local Next shim (no rushstack patch) for stability in automated metrics.
const nextShim = require("./eslint-next-no-patch.js");

module.exports = {
  ...nextShim,
  ignorePatterns: [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/out/**",
    "functions/lib/**",
  ],
};
