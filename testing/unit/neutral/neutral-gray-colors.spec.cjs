const fs = require("fs");
const path = require("path");

// Directories to scan for gray palette usage we want to eliminate.
// Marketing/public pages can be added later if desired; for now include all src.
// __dirname => testing/unit/neutral ; project root is four levels up? Actually: neutral -> unit -> testing -> (root)
// So we go up three levels.
const ROOT = path.join(__dirname, "../../..");
const TARGET_DIRS = [path.join(ROOT, "src")];

// Regex matches tailwind gray palette utilities (text|bg|border|ring)-gray-<shade>
// We purposely exclude class names that might include "gray" as a substring in custom names by anchoring the utility prefix.
const GRAY_REGEX = /\b(?:text|bg|border|ring)-gray-(?:[1-9]00)\b/g;

// Allowlist: if we temporarily need to permit specific occurrences (e.g., in legacy markdown rendering), add exact file:line substrings here.
const ALLOWLIST = new Set([
  // Example: 'src/components/foo.tsx:42:text-gray-500'
]);

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (/\.(tsx?|jsx?|cjs|mjs)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("neutral gray semantic colors compliance", () => {
  it("does not use raw gray palette utilities in core source", () => {
    const files = TARGET_DIRS.flatMap(collectFiles);
    const violations = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf8");
      let match;
      while ((match = GRAY_REGEX.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split("\n").length;
        const found = match[0];
        const key = `${rel}:${lineNumber}:${found}`;
        if (!ALLOWLIST.has(key)) {
          violations.push(key);
        }
      }
    }
    if (violations.length) {
      const list = violations.slice(0, 50).join("\n");
      throw new Error(
        `Found ${violations.length} raw gray utility occurrences. First 50:\n${list}`
      );
    }
  });
});
