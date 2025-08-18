#!/usr/bin/env node
/**
 * update-metrics-artifacts.mjs
 * Orchestrates metrics snapshot append + heatmap regeneration in one pass.
 * Optimizes by reusing existing JSON metrics if METRICS_JSON path provided (or /tmp/metrics.json present).
 * Fallback chain: existing JSON -> run programmatic metrics -> run ESLint CLI.
 */
import fs from 'node:fs';
import { runMetrics, aggregate } from './eslint-metrics-api.mjs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

function tryRead(path){ try { return fs.readFileSync(path,'utf8'); } catch { return null; } }
function safeJSON(text){ try { return JSON.parse(text); } catch { return null; } }
function run(cmd){ try { return execSync(cmd,{stdio:'pipe',encoding:'utf8',maxBuffer:10*1024*1024}); } catch(e){ return e.stdout || ''; } }

function collectMessageStats(parsed){
  let total=0, withRule=0; const sampleRules = new Set();
  for(const f of parsed){
    if(!f || !Array.isArray(f.messages)) continue;
    for(const m of f.messages){ total++; if(m.ruleId){ withRule++; sampleRules.add(m.ruleId); if(sampleRules.size>5) break; } }
  }
  return { total, withRule, sampleRules: Array.from(sampleRules).slice(0,5) };
}

async function loadMetrics(){
  const debug = !!process.env.METRICS_DEBUG;
  const forceCli = !!process.env.METRICS_FORCE_CLI;
  const candidate = process.env.METRICS_JSON || '/tmp/metrics.json';
  if(!forceCli){
    const raw = tryRead(candidate);
    if(raw){
      const parsed = safeJSON(raw);
      if(Array.isArray(parsed) && parsed.length){
        const stats = collectMessageStats(parsed);
        if(debug) console.log('[metrics:update] Reused cached metrics file %s totalMessages=%d withRuleId=%d', candidate, stats.total, stats.withRule);
        if(!(stats.total > 100 && stats.withRule === 0)) return parsed; // accept unless degraded
        if(debug) console.log('[metrics:update] Cached metrics degraded (no ruleIds) -> forcing fresh run');
      }
    }
    // programmatic path first
    let prog = [];
    try { prog = await runMetrics(); } catch(e){ if(debug) console.log('[metrics:update] runMetrics failed', e.message); }
    if(Array.isArray(prog) && prog.length){
      const stats = collectMessageStats(prog);
      if(debug) console.log('[metrics:update] Programmatic metrics messages=%d ruleIds=%d', stats.total, stats.withRule);
      if(!(stats.total>0 && stats.withRule===0)) {
        try { fs.writeFileSync('/tmp/metrics-fresh.json', JSON.stringify(prog,null,2)); } catch {}
        return prog;
      }
      if(debug) console.log('[metrics:update] Programmatic metrics degraded; falling back to CLI');
    }
  } else if(debug) {
    console.log('[metrics:update] METRICS_FORCE_CLI set: skipping cache + programmatic path');
  }
  // CLI path minimal flat config
  const cliRaw = run("npx eslint -c scripts/eslint-metrics.flat.mjs 'src/**/*.{ts,tsx,js,jsx}' -f json --no-error-on-unmatched-pattern");
  const parsedCli = safeJSON(cliRaw) || [];
  const statsCli = collectMessageStats(parsedCli);
  if(debug) console.log('[metrics:update] CLI metrics messages=%d ruleIds=%d sample=%o', statsCli.total, statsCli.withRule, statsCli.sampleRules);
  try { fs.writeFileSync('/tmp/metrics-fresh.json', JSON.stringify(parsedCli,null,2)); } catch {}
  try {
    const { errorCount, warningCount, ruleTally } = aggregate(parsedCli);
    fs.writeFileSync('/tmp/metrics-summary.json', JSON.stringify({ errors: errorCount, warnings: warningCount, ruleCounts: ruleTally, files: parsedCli.length, generated: new Date().toISOString() }, null, 2));
  } catch {}
  return parsedCli;
}

function buildSnapshot(parsed){
  const { errorCount, warningCount, ruleTally } = aggregate(parsed);
  const ordered = Object.keys(ruleTally).sort().map(k=>`${k}:${ruleTally[k]}`).join('|');
  const checksum = createHash('sha256').update(ordered).digest('hex').slice(0,16);
  const degradedRuleIds = Object.keys(ruleTally).length === 1 && (Object.keys(ruleTally)[0] === '(no-rule)' || Object.keys(ruleTally)[0] === 'internal');
  return {
    ts: new Date().toISOString(),
    files: parsed.length,
    errors: errorCount,
    warnings: warningCount,
    topRules: Object.entries(ruleTally).sort((a,b)=>b[1]-a[1]).slice(0,15),
    ruleCounts: ruleTally,
    ruleCountsChecksum: checksum,
    ruleKeyCount: Object.keys(ruleTally).length,
    degradedRuleIds
  };
}

function writeSnapshot(snap){
  const line = JSON.stringify(snap);
  fs.appendFileSync('metrics-snapshots.log', line+'\n');
  console.log('[metrics:update] snapshot appended');
}

function regenerateHeatmap(parsed){
  const FOCUS = new Set([
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-unused-vars',
    '@typescript-eslint/no-require-imports'
  ]);
  const files = [];
  for(const f of parsed){
    const counts={};
    for(const m of f.messages||[]){ if(m.ruleId && FOCUS.has(m.ruleId)) counts[m.ruleId]=(counts[m.ruleId]||0)+1; }
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    if(total>0) files.push({ file: f.filePath, total, counts });
  }
  files.sort((a,b)=>b.total-a.total);
  const top = files.slice(0,50);
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/lint-heatmap.json', JSON.stringify({ generated: new Date().toISOString(), focus: Array.from(FOCUS), top }, null, 2));
  console.log('[metrics:update] heatmap regenerated');
}

(async () => {
  const parsed = await loadMetrics();
  if(!parsed.length){
    console.error('[metrics:update] No metrics gathered (empty set)');
    process.exit(1);
  }
  const snap = buildSnapshot(parsed);
  writeSnapshot(snap);
  regenerateHeatmap(parsed);
  try {
    const { errorCount, warningCount, ruleTally } = aggregate(parsed);
    fs.mkdirSync('artifacts',{recursive:true});
    fs.writeFileSync('artifacts/metrics-summary.json', JSON.stringify({ errors: errorCount, warnings: warningCount, ruleCounts: ruleTally, files: parsed.length, generated: new Date().toISOString(), checksum: snap.ruleCountsChecksum }, null, 2));
  } catch {}
  console.log('[metrics:update] Done. Files='+snap.files+' Errors='+snap.errors+' Warnings='+snap.warnings);
})();
