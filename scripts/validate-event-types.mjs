#!/usr/bin/env node
// Validate that all event type string literals used in code are registered in EVENT_TYPES.
// Exit 1 and print UNKNOWN_EVENT: <literal> for any unregistered literal that matches a known namespace.

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "src", "lib", "events", "event-types.ts");

function readRegistry() {
  const src = fs.readFileSync(REGISTRY_PATH, "utf8");
  const m = src.match(/export\s+const\s+EVENT_TYPES\s*=\s*\[(.|\n|\r)*?\]/);
  if (!m) return { types: new Set(), prefixes: new Set() };
  const arr = (m[0].match(/['"]([^'"]+)['"]/g) || []).map((q) =>
    q.replace(/^['"]|['"]$/g, "")
  );
  const types = new Set(arr);
  const prefixes = new Set(
    arr.map((t) => (t.includes(".") ? t.split(".")[0] : null)).filter(Boolean)
  );
  return { types, prefixes };
}

function* walk(dir) {
  const ignore = new Set([
    "node_modules",
    ".next",
    "out",
    "dist",
    ".git",
    "functions/lib",
  ]);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (ignore.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(e.name)) {
      yield full;
    }
  }
}

function findUnknowns(types, prefixes) {
  const roots = [path.join(ROOT, "src"), path.join(ROOT, "functions")];
  const unknown = new Set();
  const prefixList = Array.from(prefixes);
  const strRe = /(["'])([^"']+)\1/g;
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const file of walk(r)) {
      const txt = fs.readFileSync(file, "utf8");
      for (const m of txt.matchAll(strRe)) {
        const lit = m[2];
        if (!lit || !lit.includes(".")) continue;
        if (!prefixList.some((p) => lit.startsWith(p + "."))) continue;
        if (types.has(lit)) continue;
        // Skip obviously dynamic concatenations (string immediately followed by '+')
        const after = txt[m.index + m[0].length];
        if (after === "+") continue;
        unknown.add(lit);
      }
    }
  }
  return Array.from(unknown);
}

(function main() {
  const { types, prefixes } = readRegistry();
  if (!types.size) {
    console.error("WARN: EVENT_TYPES not found or empty");
  }
  const unknowns = findUnknowns(types, prefixes);
  if (unknowns.length) {
    unknowns.forEach((u) => console.log("UNKNOWN_EVENT: " + u));
    process.exit(1);
  }
  process.exit(0);
})();
