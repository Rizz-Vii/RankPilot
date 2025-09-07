#!/usr/bin/env node
// Codemod: remove self-reexport JS stubs and update import specifiers to direct TS/TSX modules.
// Strategy:
// 1. Scan for *.js files whose entire content matches: export { default } from './<name>.tsx'; (optionally plus star export)
// 2. Record base name, delete file.
// 3. Grep project for imports referencing that stub (without extension OR with .js) and rewrite to extensionful .tsx path OR extensionless if barrel present.
// 4. Skip node_modules, .next, dist.

import fs from "fs";
import path from "path";

const root = process.cwd();
const ignoreDirs = new Set(["node_modules", ".next", "dist", "out"]);

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    if (ignoreDirs.has(entry)) continue;
    const full = path.join(dir, entry);
    if (isDir(full)) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const files = listFiles(path.join(root, "src"));
const stubPattern =
  /^export\s+\{\s*default\s*\}\s+from\s+'\.\/(.+?)\.tsx';?(?:\s*export\s+\*\s+from\s+'\.\/.+?';?)?\s*$/s;
const removed = [];

for (const f of files) {
  if (!f.endsWith(".js")) continue;
  const content = fs.readFileSync(f, "utf8");
  if (stubPattern.test(content.trim())) {
    const base = path.basename(f, ".js");
    fs.unlinkSync(f);
    removed.push({ file: f, base });
  }
}

if (!removed.length) {
  console.log("[codemod] No stub files removed.");
  process.exit(0);
}

// Build map for rewriting imports
const rewriteMap = new Map(removed.map((r) => [r.base, r]));

// Simple import regex (heuristic)
const importRegex = /(import\s+[^'";]+?from\s+['"])([^'"\n]+)(['"])/g;

for (const f of files) {
  if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
  let text = fs.readFileSync(f, "utf8");
  let changed = false;
  text = text.replace(importRegex, (m, pre, spec, post) => {
    const match = spec.match(/([^/]+)$/);
    if (!match) return m;
    const last = match[1].replace(/\.js$/, "");
    if (rewriteMap.has(last)) {
      // Replace trailing segment to .tsx extension explicitly
      const newSpec = spec.replace(
        /([^/]+)$/,
        (seg) => seg.replace(/\.js$/, "") + ".tsx"
      );
      changed = true;
      return pre + newSpec + post;
    }
    return m;
  });
  if (changed) {
    fs.writeFileSync(f, text, "utf8");
    console.log("[codemod] Rewrote imports in", path.relative(root, f));
  }
}

console.log(`[codemod] Removed ${removed.length} stub file(s).`);
removed.forEach((r) => console.log(" -", path.relative(root, r.file)));
