#!/usr/bin/env node
/**
 * Purge transient snapshot artifacts (TypeScript incremental, metrics snapshots, neuroseo size, provenance snapshots)
 * to ensure a clean baseline before a fresh typecheck or CI run.
 * Safe: Only deletes known generated files/directories; ignores if missing.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targets = [
  'tsconfig.tsbuildinfo',
  'metrics-snapshots.log',
  'artifacts/size-reduction.json',
  'artifacts/neuroseo-scan.json',
  'artifacts/provenance-snapshot.json',
  'artifacts/neuroseo-size.json'
];

let removed = 0;
for (const rel of targets) {
  const p = path.join(ROOT, rel);
  try {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isFile()) {
        fs.rmSync(p, { force: true });
        removed++;
        console.log(`[purge] removed file ${rel}`);
      }
    }
  } catch (err) {
    console.warn(`[purge] failed to remove ${rel}: ${err && err.message ? err.message : err}`);
  }
}
// Optionally prune empty artifacts dir
try {
  const art = path.join(ROOT, 'artifacts');
  if (fs.existsSync(art) && fs.readdirSync(art).length === 0) {
    fs.rmSync(art, { force: true });
    console.log('[purge] removed empty artifacts/ directory');
  }
} catch (err) {
  /* ignore */
}
console.log(`[purge] Completed. Removed ${removed} artifact(s).`);
