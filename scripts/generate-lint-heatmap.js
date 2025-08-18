#!/usr/bin/env node
/**
 * generate-lint-heatmap.js
 * Runs ESLint JSON and emits an artifact summarizing top files by selected high-noise rules.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { runMetrics } from './metrics/eslint-metrics-api.mjs';

const RULES_FOCUS = new Set([
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-unused-vars',
  '@typescript-eslint/no-require-imports'
]);

function run(cmd){
  try { return execSync(cmd,{stdio:'pipe',encoding:'utf8',maxBuffer:10*1024*1024}); }
  catch(e){ return e.stdout || ''; }
}

let raw = run("npx eslint -c scripts/eslint-metrics.flat.mjs 'src/**/*.{ts,tsx,js,jsx}' -f json --no-error-on-unmatched-pattern");
let parsed = [];
try { parsed = JSON.parse(raw); } catch { parsed = []; }
if(parsed.length===0){
  try { parsed = await runMetrics(); } catch(e){ /* degraded heatmap */ }
}

const fileAgg = [];
for(const f of parsed){
  const counts = {};
  for(const m of f.messages){
    if(RULES_FOCUS.has(m.ruleId)) counts[m.ruleId] = (counts[m.ruleId]||0)+1;
  }
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  if(total>0){
    fileAgg.push({ file: f.filePath, total, counts });
  }
}

fileAgg.sort((a,b)=> b.total - a.total);
const top = fileAgg.slice(0,50);
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/lint-heatmap.json', JSON.stringify({ generated: new Date().toISOString(), focus: Array.from(RULES_FOCUS), top }, null, 2));
console.log('Wrote artifacts/lint-heatmap.json ('+top.length+' files)');
