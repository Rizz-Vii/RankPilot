const { readFileSync } = require('fs');
const path = require('path');

/**
 * Standalone script to ensure no FeatureGate uses a legacy alias key directly.
 * Usage: node testing/unit/access/feature-gate-alias-usage.spec.cjs
 */

// Resolve project root (this file: testing/unit/access)
const projectRoot = path.join(__dirname, '../../..');
const srcDir = path.join(projectRoot, 'src');
const accessControlPath = path.join(srcDir, 'lib', 'access-control.ts');

// Extract FEATURE_ALIASES keys dynamically for accuracy
let aliasKeys = [];
try {
  const content = readFileSync(accessControlPath, 'utf8');
  const match = content.match(/export const FEATURE_ALIASES:[\s\S]*?= {([\s\S]*?)};/);
  if (match) {
    const body = match[1];
    // Simple key extractor: lines like  key: "value",
    aliasKeys = Array.from(body.matchAll(/\n\s*([a-zA-Z0-9_]+):/g)).map(m => m[1]);
  }
} catch (e) {
  console.error('[FEATURE_GATE_ALIAS_CHECK] Could not read access-control.ts', e);
  process.exit(1);
}

if (!aliasKeys.length) {
  console.warn('[FEATURE_GATE_ALIAS_CHECK] No alias keys detected – skipping (treat as pass)');
  process.exit(0);
}

function walk(dir, acc) {
  const entries = require('fs').readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if(/\.(t|j)sx?$/.test(e.name)) acc.push(full);
  }
  return acc;
}

const files = walk(srcDir, []);
const offenders = [];
const gateRegex = /<FeatureGate[^>]*feature=\"([a-zA-Z0-9_]+)\"/g;
const aliasSet = new Set(aliasKeys);

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  let m;
  while ((m = gateRegex.exec(content))) {
    const key = m[1];
    if (aliasSet.has(key)) offenders.push({ file: file.replace(projectRoot + '/', ''), key });
  }
}

if (offenders.length) {
  console.error('[FEATURE_GATE_ALIAS_CHECK] FAIL', offenders);
  process.exit(1);
} else {
  console.log('[FEATURE_GATE_ALIAS_CHECK] PASS - no FeatureGate uses alias keys', aliasKeys);
}
