#!/usr/bin/env node
/**
 * sync-env.mjs
 * Auto-updates .env.example with all discovered keys (placeholders) and optionally
 * updates .env.local with real values from current process.env.
 *
 * Safety:
 *  - Never writes secrets into .env.example (placeholders only)
 *  - .env.local must remain gitignored (already in repo)
 *
 * Usage:
 *   node scripts/sync-env.mjs                # update example + add missing keys to local (no overwrite)
 *   node scripts/sync-env.mjs --example      # only update .env.example
 *   node scripts/sync-env.mjs --local        # only ensure .env.local has all keys (fill from env if missing)
 *   node scripts/sync-env.mjs --force        # also overwrite placeholder-ish values in .env.local with env values
 *   node scripts/sync-env.mjs --dry-run      # show planned changes only
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const examplePath = path.join(root,'.env.example');
const localPath = path.join(root,'.env.local');

const args = new Set(process.argv.slice(2));
const onlyExample = args.has('--example') && !args.has('--local');
const onlyLocal = args.has('--local') && !args.has('--example');
const force = args.has('--force');
const dryRun = args.has('--dry-run');

// Collect keys from code (reuse logic simplified from list-env-keys)
const exts = new Set(['.ts','.tsx','.js','.mjs','.cjs']);
const codeDirs = ['src','functions','scripts'];
const codeVarPattern1 = /process\.env\.([A-Z0-9_]+)/g;
const codeVarPattern2 = /process\.env\[["'`]([A-Z0-9_]+)["'`]\]/g;
const jsonEnvPattern = /\$\{env:([A-Z0-9_]+)\}/g;

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full,out);
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

let codeFiles = [];
for (const d of codeDirs) walk(path.join(root,d), codeFiles);
['mcp.development.json','mcp.optimized.json','package.json'].forEach(f=>{ const fp=path.join(root,f); if (fs.existsSync(fp)) codeFiles.push(fp); });

const codeKeys = new Set();
for (const f of codeFiles) {
  let txt; try { txt = fs.readFileSync(f,'utf8'); } catch { continue; }
  let m; while ((m = codeVarPattern1.exec(txt))) codeKeys.add(m[1]);
  while ((m = codeVarPattern2.exec(txt))) codeKeys.add(m[1]);
  while ((m = jsonEnvPattern.exec(txt))) codeKeys.add(m[1]);
}

function parseEnvFile(p){
  const map = new Map();
  const lines = fs.existsSync(p)? fs.readFileSync(p,'utf8').split(/\r?\n/):[];
  lines.forEach((line,i)=>{
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq === -1) return;
    const key = line.slice(0,eq).trim();
    if (/^[A-Z0-9_]+$/.test(key)) map.set(key,{value: line.slice(eq+1), line, index:i});
  });
  return {lines,map};
}

const exampleData = parseEnvFile(examplePath);
const localData = parseEnvFile(localPath);

// Placeholder heuristics
function placeholderFor(key){
  if (key.startsWith('NEXT_PUBLIC_')) {
    if (key.endsWith('_URL')) return 'http://localhost:3000';
    return '""';
  }
  if (/TOKEN|KEY|SECRET|PASSWORD|PRIVATE|DSN|API|CLIENT_ID|CLIENT_SECRET/.test(key)) return 'YOUR_VALUE_HERE';
  if (/^(TRUE|FALSE)$/.test(key)) return 'false';
  if (key.endsWith('_ENABLED')) return 'false';
  return '""';
}

// Update .env.example
let exampleAdded = [];
if (!onlyLocal) {
  for (const key of [...codeKeys].sort()) {
    if (!exampleData.map.has(key)) {
      exampleData.lines.push(`${key}=${placeholderFor(key)}`);
      exampleAdded.push(key);
    }
  }
}

// Update .env.local
let localAdded = [], localUpdated = [];
if (!onlyExample) {
  for (const key of [...codeKeys].sort()) {
    const existing = localData.map.get(key);
    if (!existing) {
      // Add new: prefer real env value else placeholder
      const real = process.env[key];
      const val = real ? escapeVal(real) : placeholderFor(key);
      localData.lines.push(`${key}=${val}`);
      localAdded.push(key);
    } else if (force) {
      const real = process.env[key];
      if (real && shouldOverwrite(existing.value)) {
        localData.lines[existing.index] = `${key}=${escapeVal(real)}`;
        localUpdated.push(key);
      }
    }
  }
}

function shouldOverwrite(value){
  const v = (value||'').trim();
  if (!v) return true;
  return ['""','YOUR_VALUE_HERE','your_value_here','replace_me_dev_secret'].includes(v) || /placeholder/i.test(v);
}

function escapeVal(v){
  if (/\n/.test(v)) return JSON.stringify(v); // keep newlines safe
  if (/\s/.test(v) || v.includes('#')) return JSON.stringify(v);
  return v;
}

// Write changes
if (!dryRun) {
  if (!onlyLocal) {
    if (exampleAdded.length) exampleData.lines.push('', '# Added by sync-env.mjs: ' + new Date().toISOString());
    fs.writeFileSync(examplePath, exampleData.lines.join('\n'));
  }
  if (!onlyExample) {
    if (localAdded.length || localUpdated.length) localData.lines.push('', '# Synced by sync-env.mjs: ' + new Date().toISOString());
    fs.writeFileSync(localPath, localData.lines.join('\n'));
  }
}

// Report
console.log('[env:sync] Mode:', onlyExample? 'example-only' : onlyLocal? 'local-only':'both');
if (dryRun) console.log('[env:sync] DRY RUN - no files written');
if (!onlyLocal) console.log(`[env:sync] .env.example additions: ${exampleAdded.length}`);
if (!onlyExample) console.log(`[env:sync] .env.local additions: ${localAdded.length} updates: ${localUpdated.length}`);
if (exampleAdded.length) console.log('  Added to example:', exampleAdded.join(', '));
if (localAdded.length) console.log('  Added to local:', localAdded.join(', '));
if (localUpdated.length) console.log('  Updated in local:', localUpdated.join(', '));
console.log('[env:sync] Complete.');
