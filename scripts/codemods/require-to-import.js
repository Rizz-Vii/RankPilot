#!/usr/bin/env node
/**
 * require-to-import.js
 * Heuristic codemod: transform top-level const X = require('mod') into import statements.
 * Keeps dynamic/conditional requires intact.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exts = new Set([".ts", ".tsx", ".js"]);
const ignore = new Set([
  "node_modules",
  ".next",
  "dist",
  "out",
  "functions/lib",
]);

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (ignore.has(entry)) continue;
    const full = path.join(dir, entry);
    if (isDir(full)) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(path.join(root, "src")).filter((f) =>
  exts.has(path.extname(f))
);

const assignRequireRe =
  /^(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*require\(['"]([^'"()]+)['"]\);?$/;
const destructureRequireRe =
  /^(const|let|var)\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"()]+)['"]\);?$/;

function transform(content) {
  const lines = content.split(/\n/);
  const imports = [];
  const kept = [];
  let changed = false;
  for (const line of lines) {
    if (assignRequireRe.test(line.trim())) {
      const [, , ident, mod] = line.trim().match(assignRequireRe);
      imports.push(`import ${ident} from '${mod}';`);
      changed = true;
      continue;
    }
    if (destructureRequireRe.test(line.trim())) {
      const [, , idents, mod] = line.trim().match(destructureRequireRe);
      imports.push(`import { ${idents.trim()} } from '${mod}';`);
      changed = true;
      continue;
    }
    kept.push(line);
  }
  if (!changed) return null;
  // Place imports after existing shebang or first comment block
  const head = [];
  while (kept.length && /^\s*\/?[*/#!]/.test(kept[0])) head.push(kept.shift());
  return [...head, ...imports, ...kept].join("\n");
}

let converted = 0;
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const out = transform(text);
  if (out) {
    fs.writeFileSync(f, out, "utf8");
    converted++;
    console.log("[codemod] converted requires in", path.relative(root, f));
  }
}
console.log(
  `[codemod] require-to-import complete. Files changed: ${converted}`
);
