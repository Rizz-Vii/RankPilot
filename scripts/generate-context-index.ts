#!/usr/bin/env ts-node
// Context Index Generator (T56 / DQ6)
// Scans limited directories and emits a lightweight JSON index for AI agents.
// Keeps size small by only recording path + byte size + last modified epoch.

import fs from 'fs';
import path from 'path';

const ROOTS = ['src/lib', 'src/app', 'docs'];
const MAX_FILES = 500; // safety cap
const OUT_FILE = 'generated/dev/context-index.json';

interface Entry { p: string; b: number; m: number; }

function walk(dir: string, acc: Entry[]) {
  if (acc.length >= MAX_FILES) return;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item.startsWith('.') || item === 'node_modules' || item === '.next') continue;
      walk(full, acc);
    } else {
      const ext = path.extname(item);
      if (!['.ts', '.tsx', '.md', '.js', '.mjs'].includes(ext)) continue;
      acc.push({ p: full, b: stat.size, m: stat.mtimeMs });
      if (acc.length >= MAX_FILES) return;
    }
  }
}

function main() {
  const entries: Entry[] = [];
  for (const root of ROOTS) {
    if (fs.existsSync(root)) walk(root, entries);
  }
  entries.sort((a, b) => a.p.localeCompare(b.p));
  const outDir = path.dirname(OUT_FILE);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: Date.now(), entries }, null, 2));
  console.log(`Context index written: ${OUT_FILE} (${entries.length} files)`);
}

main();
