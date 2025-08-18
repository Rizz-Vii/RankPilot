#!/usr/bin/env node
/**
 * eslint-snapshot.js
 * Run ESLint (JSON output) and append aggregated metrics to metrics-snapshots.log.
 * Keeps a rolling history; each line JSON for easy diffing.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { ESLint } from 'eslint';
import { runMetrics, aggregate } from './metrics/eslint-metrics-api.mjs';

function run(cmd){
  return execSync(cmd,{stdio:'pipe',encoding:'utf8',maxBuffer:10*1024*1024});
}

async function main(){
  const start = Date.now();
  let raw;
  try {
    raw = run("npx eslint -c scripts/eslint-metrics.flat.mjs 'src/**/*.{ts,tsx,js,jsx}' -f json --no-error-on-unmatched-pattern");
  } catch(e){
    try { raw = run("npx eslint . -f json"); }
    catch(e2){
      try { raw = run("npx next lint --format json"); }
      catch(e3){ raw = e3.stdout || ''; }
    }
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = []; }
  if(parsed.length===0){
    try { parsed = await runMetrics(); } catch(e){ /* degraded */ }
  }
  const { errorCount, warningCount, ruleTally } = aggregate(parsed);
  const topRules = Object.entries(ruleTally).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const snapshot = {
    ts: new Date().toISOString(),
    durationMs: Date.now()-start,
    files: parsed.length,
    errors: errorCount,
    warnings: warningCount,
  topRules,
  ruleCounts: ruleTally
  };
  if(parsed.length===0){
    snapshot.degraded = true;
    snapshot.note = 'ESLint patch failure encountered; metrics collection degraded (no files).';
  }
  const line = JSON.stringify(snapshot);
  fs.appendFileSync('metrics-snapshots.log', line+"\n");
  console.log('[eslint-snapshot] '+line);
}

main();
