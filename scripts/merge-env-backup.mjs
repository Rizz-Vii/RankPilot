#!/usr/bin/env node
/**
 * merge-env-backup.mjs
 *
 * Purpose: Safely merge any "real" (non-placeholder) values present in .env.local.backup
 * into the current .env.local without overwriting existing real values, unless --overwrite-existing
 * is provided. Placeholders in .env.local will be replaced. Secrets are NOT printed to stdout.
 *
 * Definition of placeholder (heuristic):
 *  - empty string
 *  - value ends with '-here' (e.g., your-key-here)
 *  - value contains 'your-' and 'key'
 *  - value matches /^(sk|pk|whsec)_test_your/i (test placeholder patterns)
 *  - quoted FIREBASE_PRIVATE_KEY that contains 'YOUR_PRIVATE_KEY'
 *
 * CLI Flags:
 *  --dry-run              Show planned changes only
 *  --overwrite-existing   Allow replacing existing real values in .env.local with backup values
 *  --only-listed=VAR1,VAR2 Limit processing to a CSV subset
 *  --verbose              Extra diagnostics (never prints secret values)
 *
 * Output: Summaries only. Writes updated .env.local (in-place) and keeps a timestamped
 *         copy at .env.local.merge.<ISO>.bak before modifying.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, '.env.local');
const BACKUP_FILE = path.join(ROOT, '.env.local.backup');

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const getFlagValue = (name) => {
  const prefix = `--${name}=`;
  const match = args.find(a => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
};

const DRY_RUN = flags.has('--dry-run');
const OVERWRITE_EXISTING = flags.has('--overwrite-existing');
const VERBOSE = flags.has('--verbose');
const ONLY_LISTED = (getFlagValue('only-listed') || '').split(',').map(s => s.trim()).filter(Boolean);

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const map = {};
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1);
    // Preserve surrounding quotes but for placeholder detection remove them
    const unquoted = val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1) : val;
    map[key] = { raw: val, value: unquoted };
  }
  return map;
}

function isPlaceholder(key, value) {
  if (value === undefined) return true;
  const v = value.trim();
  if (v === '') return true;
  if (/your-?[^\s]*-here/i.test(v)) return true; // generic pattern
  if (/your_?api_?key/i.test(v)) return true;
  if (/your-?stripe-?secret/i.test(v)) return true;
  if (/your-?webhook-?secret/i.test(v)) return true;
  if (/^(sk|pk|whsec)_test_your/i.test(v)) return true;
  if (key === 'FIREBASE_PRIVATE_KEY' && /YOUR_PRIVATE_KEY/.test(v)) return true;
  // Heuristic: long token presence suggests real
  return false;
}

function mask(value) {
  if (value == null) return '';
  const v = value.toString();
  if (v.length <= 6) return '*'.repeat(v.length);
  return v.slice(0,3) + '...' + v.slice(-3);
}

function buildOutput(envMap, originalText) {
  // Reconstruct file preserving ordering/comments where possible.
  // Strategy: read original file lines and replace line values when updated; append new keys at end.
  const lines = originalText.split(/\r?\n/);
  const seen = new Set();
  const updatedLines = lines.map(line => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) return line;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    if (!(key in envMap)) return line; // unchanged or removed (we do not remove keys)
    seen.add(key);
    return `${key}=${envMap[key].raw}`;
  });
  // Append any new keys (should be none for merge typical scenario)
  for (const key of Object.keys(envMap)) {
    if (!seen.has(key)) {
      updatedLines.push(`${key}=${envMap[key].raw}`);
    }
  }
  return updatedLines.join('\n');
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error('[merge-env-backup] No .env.local.backup file found. Aborting.');
  process.exit(1);
}
if (!fs.existsSync(ENV_FILE)) {
  console.error('[merge-env-backup] No .env.local file found. Aborting.');
  process.exit(1);
}

const backupText = fs.readFileSync(BACKUP_FILE, 'utf8');
const currentText = fs.readFileSync(ENV_FILE, 'utf8');
const backupMap = readEnvFile(BACKUP_FILE);
const currentMap = readEnvFile(ENV_FILE);

const changes = [];

for (const [key, bEntry] of Object.entries(backupMap)) {
  if (ONLY_LISTED.length && !ONLY_LISTED.includes(key)) continue;
  const bVal = bEntry.value;
  if (bVal == null) continue;
  const isBackupPlaceholder = isPlaceholder(key, bVal);
  if (isBackupPlaceholder) continue; // ignore placeholders from backup

  const cEntry = currentMap[key];
  if (!cEntry) {
    // New key from backup
    currentMap[key] = { raw: bEntry.raw, value: bEntry.value };
    changes.push({ key, action: 'add', from: null, to: bVal });
    continue;
  }
  const cVal = cEntry.value;
  const isCurrentPlaceholder = isPlaceholder(key, cVal);

  if (isCurrentPlaceholder) {
    // Replace placeholder
    currentMap[key] = { raw: bEntry.raw, value: bEntry.value };
    changes.push({ key, action: 'replace-placeholder', from: cVal, to: bVal });
    continue;
  }
  if (OVERWRITE_EXISTING && cVal !== bVal) {
    currentMap[key] = { raw: bEntry.raw, value: bEntry.value };
    changes.push({ key, action: 'overwrite', from: cVal, to: bVal });
  } else if (VERBOSE && cVal === bVal) {
    changes.push({ key, action: 'unchanged', from: cVal, to: bVal });
  }
}

const summary = {
  totalBackupKeys: Object.keys(backupMap).length,
  processedKeys: changes.length,
  actions: changes.reduce((acc, c) => { acc[c.action] = (acc[c.action]||0)+1; return acc; }, {}),
};

console.log('[merge-env-backup] Summary:', JSON.stringify(summary, null, 2));
if (changes.length) {
  console.log('[merge-env-backup] Detailed (masked):');
  for (const c of changes) {
    console.log(`  ${c.key} -> ${c.action} (${c.from?mask(c.from):'∅'} => ${mask(c.to)})`);
  }
} else {
  console.log('[merge-env-backup] No changes required.');
}

if (DRY_RUN) {
  console.log('[merge-env-backup] DRY RUN - no file written.');
  process.exit(0);
}

if (changes.length) {
  const backupOut = path.join(ROOT, `.env.local.merge.${new Date().toISOString().replace(/[:]/g,'-')}.bak`);
  fs.writeFileSync(backupOut, currentText, 'utf8');
  const newContent = buildOutput(currentMap, currentText);
  fs.writeFileSync(ENV_FILE, newContent + '\n# Merged by merge-env-backup.mjs ' + new Date().toISOString() + '\n', 'utf8');
  console.log('[merge-env-backup] Wrote updated .env.local (previous version stored at', backupOut + ')');
} else {
  console.log('[merge-env-backup] Skipped writing since no changes.');
}
