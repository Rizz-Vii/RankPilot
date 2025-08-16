#!/usr/bin/env node
import { loadConfig, validateConfig } from './config';
import { parseTasks } from './core/taskParsing';
import { classify } from './core/classification';
import { plan, savePlanText, planWithOpenAI } from './planning/planner';
import { runBatch } from './execution/runBatch';
import { runValidators } from './validation/validators';
import { writeRunLog } from './state/logWriter';
import { loadPlugins } from './plugins';
import { getRunnersFor } from './execution/toolRegistry';
import type { Task } from '../../types/brain';

function arg(name: string, def?: string) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? (process.argv[i + 1] || '') : def;
}

async function main() {
  const cfg = loadConfig();
  const v = validateConfig(cfg); if (!v.ok) throw new Error('config invalid');
  const mode = arg('mode', cfg.modes?.default || 'plan-only');
  const verifyGuardFail = process.argv.includes('--verify-guard-fail');
  const forceValidatorFail = process.argv.includes('--force-validator-fail');
  let tasks: Task[] = parseTasks({}) as any;
  if (!tasks.length) tasks = [{ id: 'cli-1', title: 'CLI demo task', raw: 'demo', domain: 'docs', status: 'TODO' }];
  tasks = tasks.map((t) => ({ ...t, domain: classify(t.title + ' ' + (t.raw || '')) }));
  const p = plan(tasks, { contextKb: 8 });
  const estLoc = (p.steps?.length || 0) * 30;
  const preflightEstimate = { files: Math.min(tasks.length, (cfg.governance?.maxBatchTasks || 10)), locAdded: estLoc };
  const runId = 'cli-' + Date.now();
  savePlanText(runId, p);
  const plugins = loadPlugins();
  let diffs = { files: 0, locAdded: 0 };
  let validation: any = undefined;
  const toolsInvoked = Array.from(new Set(tasks.flatMap(t => getRunnersFor(t.domain || 'docs', cfg).map(r => r.name))));
  const tStart = Date.now();
  let tokenUsed = Math.round((JSON.stringify(p).length || 0) / 4);
  let aborted = false;
  const followUps: any[] = [];
  if (mode === 'execute') {
    validation = await runValidators({ cfg, forceFail: forceValidatorFail || process.env.PB_BRAIN_FORCE_VALIDATION_FAIL === '1' });
    const exec = await runBatch(tasks, { mode, cfg, preflightEstimate: verifyGuardFail ? { files: 99, locAdded: 9999 } : preflightEstimate });
    diffs = exec.diffs;
  } else if (mode === 'dry-run') {
    validation = await runValidators({ cfg, forceFail: forceValidatorFail || process.env.PB_BRAIN_FORCE_VALIDATION_FAIL === '1' });
    writeRunLog({ ts: Date.now(), runId: 'plan-' + Date.now(), mode: 'dry-run', plan: p, validation });
  } else if (mode === 'auto') {
    // Minimal auto: single-batch execute with validators
    const steps = p.steps || [];
    const { splitPlan } = await import('./governance/splitter.js');
    const groups = splitPlan(steps, cfg);
    let first = true;
    for (const _ of groups) {
      validation = await runValidators({ cfg, forceFail: !first && (forceValidatorFail || process.env.PB_BRAIN_FORCE_VALIDATION_FAIL === '1'), plugins });
      const exec = await runBatch(tasks, { mode: 'execute', cfg, preflightEstimate });
      diffs = exec.diffs;
      first = false;
      // Simple budget check per group
      if (Date.now() - tStart > (cfg.budget.timeSeconds * 1000)) { aborted = true; followUps.push({ type: 'budget', note: 'time exceeded' }); break; }
      if (tokenUsed > cfg.budget.token) { aborted = true; followUps.push({ type: 'budget', note: 'token exceeded' }); break; }
    }
  } else {
    // plan-only
    console.log(JSON.stringify({ strategy: p.strategy, steps: p.steps.length }));
  }
  const t0 = Date.now();
  const outcome = aborted ? { status: 'FAIL' as const } : (validation && (validation.lint === 'fail' || validation.typecheck === 'fail' || validation.tests === 'fail')) ? { status: 'FAIL' as const } : { status: 'OK' as const };
  if (outcome.status === 'FAIL') {
    try { const fs = await import('fs'); const ts = new Date().toISOString().replace(/[:.]/g, '-'); fs.mkdirSync('artifacts/brain', { recursive: true }); fs.writeFileSync(`artifacts/brain/remediation-${ts}.json`, JSON.stringify({ reason: 'validation', tasks }, null, 2)); } catch { }
    if (aborted) followUps.push({ type: 'action', suggestion: 'Reduce scope or increase budget' });
  }
  await writeRunLog({ ts: Date.now(), runId, mode, tasks, domains: [...new Set(tasks.map(t => t.domain))], toolsInvoked, diffs, validation, outcome, followUps, aborted, reason: aborted ? 'budget' : 'normal', metrics: { elapsedMs: Date.now() - t0, estTokens: tokenUsed, budget: { tokenUsed, tokenBudget: cfg.budget.token, timeUsedMs: Date.now() - tStart, timeBudgetMs: cfg.budget.timeSeconds * 1000 } } });
}

main().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
