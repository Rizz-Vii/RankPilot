// Local shim of eslint-config-next without @rushstack/eslint-patch to bypass patch failure under ESLint 9 flat config.
// Derived from eslint-config-next/index.js v15.4.6 with only the patch require removed.
const keptPaths = [];
const sortedPaths = [];
const cwd = process.cwd().replace(/\\/g, "/");
const originalPaths = require.resolve.paths("eslint-plugin-import");

for (let i = originalPaths.length - 1; i >= 0; i--) {
  const currentPath = originalPaths[i];
  if (currentPath.replace(/\\/g, "/").startsWith(cwd)) {
    sortedPaths.push(currentPath);
  } else {
    keptPaths.unshift(currentPath);
  }
}
sortedPaths.push(...keptPaths);

const hookPropertyMap = new Map(
  [
    "@typescript-eslint/eslint-plugin",
    "eslint-plugin-import",
    "eslint-plugin-react",
    "eslint-plugin-jsx-a11y",
  ].map((request) => [
    request,
    require.resolve(request, { paths: sortedPaths }),
  ])
);

const mod = require("module");
const resolveFilename = mod._resolveFilename;
mod._resolveFilename = function (request, parent, isMain, options) {
  const hookResolved = hookPropertyMap.get(request);
  if (hookResolved) {
    request = hookResolved;
  }
  return resolveFilename.call(mod, request, parent, isMain, options);
};

module.exports = {
  extends: [
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@next/next/recommended",
  ],
  plugins: ["import", "react", "jsx-a11y"],
  rules: {
    "import/no-anonymous-default-export": "warn",
    "react/no-unknown-property": "off",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "jsx-a11y/alt-text": [
      "warn",
      {
        elements: ["img"],
        img: ["Image"],
      },
    ],
    "jsx-a11y/aria-props": "warn",
    "jsx-a11y/aria-proptypes": "warn",
    "jsx-a11y/aria-unsupported-elements": "warn",
    "jsx-a11y/role-has-required-aria-props": "warn",
    "jsx-a11y/role-supports-aria-props": "warn",
    "react/jsx-no-target-blank": "off",
  },
  parser: require.resolve("eslint-config-next/parser.js"),
  parserOptions: {
    requireConfigFile: false,
    sourceType: "module",
    allowImportExportEverywhere: true,
    babelOptions: {
      presets: ["next/babel"],
      caller: { supportsTopLevelAwait: true },
    },
  },
  overrides: [
    {
      files: ["**/*.ts?(x)"],
      parser: "@typescript-eslint/parser",
      parserOptions: { sourceType: "module" },
    },
  ],
  settings: {
    react: { version: "detect" },
    "import/parsers": {
      [require.resolve("@typescript-eslint/parser")]: [
        ".ts",
        ".mts",
        ".cts",
        ".tsx",
        ".d.ts",
      ],
    },
    "import/resolver": {
      [require.resolve("eslint-import-resolver-node")]: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
      [require.resolve("eslint-import-resolver-typescript")]: {},
    },
  },
};
