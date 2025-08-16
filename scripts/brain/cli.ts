#!/usr/bin/env node
import { loadConfig, validateConfig } from './config';
import { parseTasks } from './core/taskParsing';
import { classify } from './core/classification';
import { plan } from './planning/planner';
import { runBatch } from './execution/runBatch';
import { runValidators } from './validation/validators';
import { writeRunLog } from './state/logWriter';
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
  let tasks: Task[] = parseTasks({}) as any;
  if (!tasks.length) tasks = [{ id: 'cli-1', title: 'CLI demo task', raw: 'demo', domain: 'docs', status: 'TODO' }];
  tasks = tasks.map((t) => ({ ...t, domain: classify(t.title + ' ' + (t.raw || '')) }));
  const p = plan(tasks, { contextKb: 8 });
  let diffs = { files: 0, locAdded: 0 };
  let validation: any = undefined;
  const toolsInvoked = Array.from(new Set(tasks.flatMap(t => getRunnersFor(t.domain || 'docs', cfg).map(r => r.name))));
  if (mode === 'execute') {
    validation = await runValidators({ cfg });
    const exec = await runBatch(tasks, { mode, cfg, preflightEstimate: verifyGuardFail ? { files: 99, locAdded: 9999 } : undefined });
    diffs = exec.diffs;
  } else if (mode === 'dry-run') {
    validation = await runValidators({ cfg });
    writeRunLog({ ts: Date.now(), runId: 'plan-' + Date.now(), mode: 'dry-run', plan: p, validation });
  } else if (mode === 'auto') {
    // Minimal auto: single-batch execute with validators
    validation = await runValidators({ cfg });
    const exec = await runBatch(tasks, { mode: 'execute', cfg });
    diffs = exec.diffs;
  } else {
    // plan-only
    console.log(JSON.stringify({ strategy: p.strategy, steps: p.steps.length }));
  }
  const outcome = (validation && (validation.lint === 'fail' || validation.typecheck === 'fail' || validation.tests === 'fail')) ? { status: 'FAIL' as const } : { status: 'OK' as const };
  await writeRunLog({ ts: Date.now(), runId: 'cli-' + Date.now(), mode, tasks, domains: [...new Set(tasks.map(t => t.domain))], toolsInvoked, diffs, validation, outcome });
}

main().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
