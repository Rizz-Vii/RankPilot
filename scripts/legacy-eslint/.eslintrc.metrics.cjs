/* Legacy style ESLint config dedicated to metrics collection (avoids flat config constraints).
   Moved under scripts/legacy-eslint to prevent Next/ESLint 9 from trying to parse it during build. */
module.exports = {
  root: false,
  extends: [require.resolve("../../scripts/eslint-next-no-patch.js")],
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { sourceType: "module", ecmaVersion: 2022 },
  plugins: ["@typescript-eslint", "react", "jsx-a11y", "import"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: require.resolve("@typescript-eslint/parser"),
      parserOptions: { sourceType: "module", ecmaVersion: 2022 },
    },
  ],
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "dist/",
    "out/",
    "functions/lib/",
  ],
};
