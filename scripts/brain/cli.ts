#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import type { Task } from '../../types/brain';
import { loadConfig, validateConfig } from './config';
import { classify } from './core/classification';
import { parseTasks } from './core/taskParsing';
import { hydrateBrainEnv } from './env';
import { runBatch } from './execution/runBatch';
import { getRunnersFor } from './execution/toolRegistry';
import type { Mission } from './mission/missionManager';
import { runMissionCycle } from './mission/missionManager';
import type { EnhancementAnalysis } from './mission/prioritizer';
import { prioritizeEnhancements } from './mission/prioritizer';
import { plan, planWithOpenAI, savePlanText, type BrainPlan } from './planning/planner';
import { loadPlugins } from './plugins';
import { writeRunLog } from './state/logWriter';
import type { MemoryEvent } from './state/memory';
import { runValidators } from './validation/validators';
let recordMemory: ((ev: MemoryEvent) => void) | undefined;
try { recordMemory = require('./state/memory').recordMemory as (ev: MemoryEvent) => void; } catch { }

// Simple color/style helpers (avoid adding deps). Disable if NO_COLOR set.
const useColor = !process.env.NO_COLOR;
const c = (code: number) => (s: string): string => useColor ? `\u001b[${code}m${s}\u001b[0m` : s;
const dim = c(2);
const cyan = c(36);
const green = c(32);
const yellow = c(33);
const red = c(31);
const magenta = c(35);
function banner(title: string) {
  const line = ''.padEnd(Math.max(8, title.length + 4), '─');
  return `\n${magenta(line)}\n${magenta('│')} ${title} ${magenta('│')}\n${magenta(line)}\n`;
}

function formatList<T>(items: T[], fmt: (v: T, i: number) => string): string {
  return items.map((v, i) => `  ${dim((i + 1).toString().padStart(2, '0'))} ${fmt(v, i)}`).join('\n');
}

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? (process.argv[i + 1] || '') : def;
}

async function main() {
  hydrateBrainEnv();
  const cfg = loadConfig();
  const v = validateConfig(cfg); if (!v.ok) throw new Error('config invalid');
  const mode = arg('mode', cfg.modes?.default || 'plan-only');
  const watch = process.argv.includes('--watch');
  const ingestConversationPath = arg('ingestConversation'); // path to a JSON or text file representing chat to ingest into memory
  const asJson = process.argv.includes('--json');
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const tsHuman = `${String(now.getDate()).padStart(2, '0')}-${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
  // Compute Melbourne local time and timezone difference (server vs Australia/Melbourne)
  function format12(d: Date, tz?: string) {
    const fmt = new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
    let s = fmt.format(d); // e.g., "5:53 pm"
    // Normalise to HH:MM AM/PM
    const m = s.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
    if (!m) return s;
    return `${m[1].padStart(2, '0')}:${m[2]} ${m[3].toUpperCase()}`;
  }
  function getOffsetMinutes(date: Date, timeZone: string): number {
    const f = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const parts: Record<string, string> = {};
    for (const p of f.formatToParts(date)) if (p.type !== 'literal') parts[p.type] = p.value;
    const asUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    return (asUTC - date.getTime()) / 60000; // minutes ahead of UTC
  }
  const melbTz = 'Australia/Melbourne';
  let melbTime = '';
  let tzDiffStr = '';
  try {
    melbTime = format12(now, melbTz);
    const melbOffset = getOffsetMinutes(now, melbTz); // minutes east of UTC
    const serverOffset = -now.getTimezoneOffset(); // minutes east of UTC for server env
    const diff = melbOffset - serverOffset; // minutes difference Melbourne - server (may be fractional)
    const rounded = Math.round(diff); // nearest minute
    const sign = rounded >= 0 ? '+' : '-';
    const abs = Math.abs(rounded);
    const dh = Math.floor(abs / 60);
    const dm = abs % 60;
    tzDiffStr = `${sign}${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}`;
  } catch { melbTime = 'N/A'; tzDiffStr = 'N/A'; }
  const verifyGuardFail = process.argv.includes('--verify-guard-fail');
  const forceValidatorFail = process.argv.includes('--force-validator-fail');
  if (mode === 'mission') {
    const previousMission = (() => { try { if (fs.existsSync('artifacts/brain/previousMission.json')) return JSON.parse(fs.readFileSync('artifacts/brain/previousMission.json', 'utf8')); } catch { } return undefined; })();
    const mission = runMissionCycle();
    const delta = previousMission ? {
      tsErrors: mission.diagnostics.typecheck.errors - (previousMission.diagnostics?.typecheck?.errors || 0),
      lintErrors: mission.diagnostics.lint.errors - (previousMission.diagnostics?.lint?.errors || 0),
      lintWarnings: mission.diagnostics.lint.warnings - (previousMission.diagnostics?.lint?.warnings || 0)
    } : undefined;
    const backlogTarget = {
      goalTsErrors: 0,
      goalLintErrors: 0,
      goalLintWarnings: 40 // heuristic threshold
    };
    if (asJson) {
      console.log(JSON.stringify({
        date: tsHuman,
        melbTime,
        utcDelta: tzDiffStr,
        mission: mission.summary,
        status: mission.status,
        steps: mission.immediateSteps.length,
        diagnostics: {
          typecheck: mission.diagnostics.typecheck.errors,
          lint: {
            errors: mission.diagnostics.lint.errors,
            warnings: mission.diagnostics.lint.warnings
          }
        },
        delta,
        backlogTarget
      }));
    } else {
      console.log(banner('Mission Snapshot') +
        `${cyan('Date')}: ${tsHuman}  ${cyan('Melb')}: ${melbTime} UTCΔ=${tzDiffStr}\n` +
        `${cyan('Status')}: ${mission.status === 'active' ? yellow('active') : green('clean')}  ` +
        `${cyan('Summary')}: ${mission.summary}\n` +
        `${cyan('Diagnostics')}: TS=${mission.diagnostics.typecheck.errors}  LintE=${mission.diagnostics.lint.errors}  LintW=${mission.diagnostics.lint.warnings}\n` +
        (delta ? `  ${dim('[Δ TS=' + (delta.tsErrors >= 0 ? '+' : '') + delta.tsErrors + ' LE=' + (delta.lintErrors >= 0 ? '+' : '') + delta.lintErrors + ' LW=' + (delta.lintWarnings >= 0 ? '+' : '') + delta.lintWarnings + ']')}` : '') +
        `\n${cyan('Targets')}: TS<=${backlogTarget.goalTsErrors} LintE<=${backlogTarget.goalLintErrors} LintW<=${backlogTarget.goalLintWarnings}\n` +
        `${cyan('Immediate Steps')} (${mission.immediateSteps.length}):\n` +
        (mission.immediateSteps.length ? formatList(mission.immediateSteps, s => green(s.title) + dim(' — ' + s.rationale)) : dim('  (none)')) + '\n');
    }
    return;
  } else if (mode === 'loop-status') {
    // Summarize recent run logs and mission history
    const dir = 'artifacts/brain';
    const runs = fs.readdirSync(dir).filter(f => f.startsWith('run-') && f.endsWith('.json')).sort().slice(-10);
    const summaries = runs.map(f => { try { const obj = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return { runId: obj.runId, mode: obj.mode, status: obj.outcome?.status, files: obj.diffs?.files, loc: obj.diffs?.locAdded, timeMs: obj.metrics?.elapsedMs }; } catch { return null; } }).filter(Boolean);
    let mission: any = undefined; try { mission = JSON.parse(fs.readFileSync('artifacts/brain/currentMission.json', 'utf8')); } catch { }
    if (asJson) {
      console.log(JSON.stringify({ date: tsHuman, melbTime, utcDelta: tzDiffStr, recentRuns: summaries, mission: mission ? { tsErrors: mission.diagnostics.typecheck.errors, lintErrors: mission.diagnostics.lint.errors, lintWarnings: mission.diagnostics.lint.warnings } : null }));
    } else {
      console.log(banner('Loop Status') + `${cyan('Date')}: ${tsHuman}  ${cyan('Melb')}: ${melbTime} UTCΔ=${tzDiffStr}\n` +
        `${cyan('Recent Runs')} (${summaries.length}):\n` + summaries.map((r, i) => `  ${dim(String(i + 1).padStart(2, '0'))} ${green(r!.runId)} ${dim(r!.mode)} ${r!.status === 'OK' ? green('OK') : red('FAIL')} ${dim(`files=${r!.files || 0} loc=${r!.loc || 0} t=${r!.timeMs || 0}ms`)}`).join('\n') + '\n' +
        (mission ? `${cyan('Current Mission')}: TS=${mission.diagnostics.typecheck.errors} LintE=${mission.diagnostics.lint.errors} LintW=${mission.diagnostics.lint.warnings}\n` : dim('No mission snapshot')));
    }
    return;
  } else if (mode === 'ask') {
    let mission: Mission | undefined = undefined;
    try { if (fs.existsSync('artifacts/brain/currentMission.json')) mission = JSON.parse(fs.readFileSync('artifacts/brain/currentMission.json', 'utf8')); } catch { }
    if (!mission) mission = runMissionCycle();
    const analysis: EnhancementAnalysis = prioritizeEnhancements(mission);
    if (asJson) {
      console.log(JSON.stringify({
        date: tsHuman,
        melbTime,
        utcDelta: tzDiffStr,
        preferred: analysis.ordering.slice(0, 5),
        context: analysis.context
      }));
    } else {
      console.log(banner('Enhancement Priorities') +
        `${cyan('Date')}: ${tsHuman}  ${cyan('Melb')}: ${melbTime} UTCΔ=${tzDiffStr}\n` +
        `${cyan('Context')}: TS=${analysis.context.tsErrors} LintE=${analysis.context.lintErrors} LintW=${analysis.context.lintWarnings} Steps=${analysis.context.immediateSteps}\n` +
        formatList(analysis.ordering.slice(0, 8), o => `${o.rank <= 3 ? yellow(o.rank.toString()) : dim(o.rank.toString())} ${green(o.title)} ${dim(o.reason)}`) + '\n');
    }
    return;
  }
  else if (mode === 'autopulse') {
    // Periodic autonomous diagnostics + plan refresh loop
    const cycles = Number(arg('cycles', '5')) || 5;
    const intervalMs = Number(arg('intervalMs', process.env.BRAIN_AUTOPULSE_INTERVAL_MS || '60000')) || 60000;
    const results: any[] = [];
    for (let i = 0; i < cycles; i++) {
      const started = Date.now();
      const mission = runMissionCycle();
      const p: BrainPlan = plan([{ id: 'autopulse-' + i, title: 'autopulse context refresh', raw: 'refresh', domain: 'docs', status: 'TODO' } as any], { contextKb: 4 });
      try { recordMemory && recordMemory({ ts: Date.now(), source: 'brain', kind: 'autopulse-cycle', status: 'ok', meta: { cycle: i + 1, cycles, tsErrors: mission.diagnostics.typecheck.errors, lintErrors: mission.diagnostics.lint.errors, lintWarnings: mission.diagnostics.lint.warnings, steps: p.steps.length } }); } catch { }
      results.push({ cycle: i + 1, tsErrors: mission.diagnostics.typecheck.errors, lintErrors: mission.diagnostics.lint.errors, lintWarnings: mission.diagnostics.lint.warnings, steps: p.steps.length, elapsedMs: Date.now() - started });
      if (i < cycles - 1) await new Promise(r => setTimeout(r, intervalMs));
    }
    if (asJson) {
      console.log(JSON.stringify({ date: tsHuman, melbTime, utcDelta: tzDiffStr, cycles: results.length, results }));
    } else {
      console.log(banner('Autopulse Summary') + `${cyan('Cycles')}: ${results.length} interval=${intervalMs}ms\n` + results.map(r => `  ${dim(String(r.cycle).padStart(2, '0'))} TS=${r.tsErrors} LintE=${r.lintErrors} LintW=${r.lintWarnings} steps=${r.steps} ${dim(r.elapsedMs + 'ms')}`).join('\n') + '\n');
    }
    return;
  }
  // Conversation ingestion (append each line or entire file as a memory event for context awareness)
  if (ingestConversationPath) {
    try {
      const pth = path.resolve(ingestConversationPath);
      if (fs.existsSync(pth)) {
        const raw = fs.readFileSync(pth, 'utf8');
        const lines = raw.split(/\n+/).filter(l => l.trim()).slice(-50);
        lines.forEach((line, idx) => { try { recordMemory && recordMemory({ ts: Date.now(), source: 'brain', kind: 'chat-ingest', id: 'chat-' + idx, status: 'ok', meta: { excerpt: line.slice(0, 160) } }); } catch { } });
      }
    } catch { }
  }
  let tasks: Task[] = parseTasks({}) as any;
  if (!tasks.length) tasks = [{ id: 'cli-1', title: 'CLI demo task', raw: 'demo', domain: 'docs', status: 'TODO' }];
  tasks = tasks.map((t) => ({ ...t, domain: classify(t.title + ' ' + (t.raw || '')) }));
  const useOpenAI = process.env.BRAIN_USE_OPENAI === '1';
  const p: BrainPlan = useOpenAI ? await planWithOpenAI(tasks, cfg, 8) : plan(tasks, { contextKb: 8 });
  const tokenMeta = p.meta || {};
  // Simple cost estimation (override via env). Provide defaults extremely low to avoid surprises.
  const promptRate = Number(process.env.BRAIN_COST_PROMPT_RATE || '0.0000015'); // USD per token
  const completionRate = Number(process.env.BRAIN_COST_COMPLETION_RATE || '0.0000020');
  const promptTokens = tokenMeta.promptTokens || 0;
  const completionTokens = tokenMeta.completionTokens || 0;
  const estCost = (promptTokens * promptRate) + (completionTokens * completionRate);
  const estLoc = (p.steps?.length || 0) * 30;
  const preflightEstimate = { files: Math.min(tasks.length, (cfg.governance?.maxBatchTasks || 10)), locAdded: estLoc };
  const runId = 'cli-' + Date.now();
  savePlanText(runId, p);
  // Record memory event for plan generation
  try { recordMemory && recordMemory({ ts: Date.now(), source: 'brain', kind: 'plan-generated', id: runId, status: 'ok', meta: { steps: p.steps?.length || 0, strategy: p.strategy, model: tokenMeta.model, tokens: tokenMeta.totalTokens } }); } catch { }
  // Optional: enqueue steps into codex queue (disabled unless env flag set)
  if (process.env.BRAIN_ENQUEUE_FROM_PLAN === '1' && (p.steps?.length || 0) > 0) {
    try {
      const queueFile = 'sessions/aider-queue.jsonl';
      const nowIso = new Date().toISOString();
      if (!fs.existsSync(queueFile)) {
        fs.mkdirSync('sessions', { recursive: true });
        fs.writeFileSync(queueFile, JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' }) + '\n');
      }
      const existing = fs.readFileSync(queueFile, 'utf8').trim().split(/\n/).slice(1).map((l: string) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const existingIds = new Set(existing.map((t: any) => t.taskId));
      const newLines: string[] = [];
      let idx = 0;
      for (const step of p.steps || []) {
        idx += 1; if (idx > 20) break; // safety cap
        const taskId = `BRAIN-${runId}-S${idx}`;
        if (existingIds.has(taskId)) continue;
        const task = { taskId, summary: `Brain planned step ${idx} (${step.kind || 'do'})`, status: 'pending', createdAt: nowIso, updatedAt: nowIso };
        newLines.push(JSON.stringify(task));
      }
      if (newLines.length) fs.appendFileSync(queueFile, newLines.join('\n') + '\n');
    } catch { }
  }
  if (watch) {
    // Simple file watcher: triggers plan-only when source files change (debounced)
    const debounceMs = 5000;
    let last = 0; let timer: NodeJS.Timeout | undefined;
    const trigger = () => {
      const nowTs = Date.now();
      const run = () => {
        try { console.log(dim('[watch] change detected -> refreshing plan-only')); }
        catch { }
        try { require('./state/memory').recordMemory({ ts: Date.now(), source: 'brain', kind: 'watch-trigger', status: 'ok', meta: { reason: 'fs-change' } }); } catch { }
        // spawn a detached plan-only run
        const { spawn } = require('child_process');
        const proc = spawn('node', ['dist/brain/scripts/brain/cli.js', '--mode', 'plan-only'], { stdio: 'ignore', detached: true, env: { ...process.env, BRAIN_AUTOTRIGGERED: '1' } });
        proc.unref();
      };
      if (nowTs - last < debounceMs) { if (timer) clearTimeout(timer); timer = setTimeout(run, debounceMs); } else { last = nowTs; run(); }
    };
    const watchDirs = ['src', 'functions', 'scripts'];
    watchDirs.forEach(d => { if (fs.existsSync(d)) fs.watch(d, { recursive: true }, (_evt, _file) => trigger()); });
  }
  const plugins = loadPlugins();
  let diffs = { files: 0, locAdded: 0 };
  interface ValidationResult { lint: string; typecheck: string; tests: string }
  let validation: ValidationResult | undefined = undefined;
  const toolsInvoked = Array.from(new Set(tasks.flatMap(t => getRunnersFor(t.domain || 'docs', cfg).map(r => r.name))));
  const tStart = Date.now();
  let tokenUsed = Math.round((JSON.stringify(p).length || 0) / 4);
  let aborted = false;
  interface FollowUp { type: string; note?: string; suggestion?: string }
  const followUps: FollowUp[] = [];
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
    if (asJson) {
      const loopSuggestion = p.steps.some((s) => {
        const step = s as { contextNote?: string };
        return /lint|type/i.test(step.contextNote || '');
      }) ? 'aider' : 'codex';
      console.log(JSON.stringify({
        date: tsHuman,
        melbTime,
        utcDelta: tzDiffStr,
        strategy: p.strategy,
        steps: p.steps.length,
        loopSuggestion,
        tokens: tokenMeta,
        cost: { promptRate, completionRate, estCost: Number(estCost.toFixed(6)) }
      }));
    } else {
      // Proposed loop assignment: aider for lint/type remediation tasks, codex for broader refactors.
      const loopSuggestion = p.steps.some((s) => {
        const step = s as { contextNote?: string };
        return /lint|type/i.test(step.contextNote || '');
      }) ? 'aider (remediation)' : 'codex (general)';
      console.log(banner('Plan Summary') +
        `${cyan('Date')}: ${tsHuman}  ${cyan('Melb')}: ${melbTime} UTCΔ=${tzDiffStr}\n` +
        `${cyan('Strategy')}: ${p.strategy}${useOpenAI ? (tokenMeta.totalTokens ? ' ' + dim(`tokens=${tokenMeta.totalTokens}`) : '') : ''}${useOpenAI && tokenMeta.model ? ' ' + dim(`[model=${tokenMeta.model}]`) : ''}\n` +
        (useOpenAI && tokenMeta.totalTokens ? `${cyan('Token Usage')}: prompt=${promptTokens} completion=${completionTokens} total=${tokenMeta.totalTokens} estCost=$${estCost.toFixed(4)}${tokenMeta.model ? ' model=' + tokenMeta.model : ''}\n` : '') +
        `${cyan('Steps')}: ${p.steps.length}\n` +
        `${cyan('Loop Suggestion')}: ${loopSuggestion}\n` +
        (p.steps.slice(0, 12).map((s, i: number) => {
          const step = s as { contextNote?: string; kind?: string };
          const note = step.contextNote || '';
          const loop = /lint|type/i.test(note) ? 'aider' : 'codex';
          const tag = loop === 'aider' ? yellow('[aider]') : cyan('[codex]');
          return `  ${dim((i + 1).toString().padStart(2, '0'))} ${tag} ${green(step.kind || 'step')} ${dim(note)}`;
        }).join('\n')) +
        (p.steps.length > 12 ? `\n  ${dim('… +' + (p.steps.length - 12) + ' more')}` : '') + '\n');
    }
  }
  const t0 = Date.now();
  const outcome = aborted ? { status: 'FAIL' as const } : (validation && (validation.lint === 'fail' || validation.typecheck === 'fail' || validation.tests === 'fail')) ? { status: 'FAIL' as const } : { status: 'OK' as const };
  if (outcome.status === 'FAIL') {
    try { const fs = await import('fs'); const ts = new Date().toISOString().replace(/[:.]/g, '-'); fs.mkdirSync('artifacts/brain', { recursive: true }); fs.writeFileSync(`artifacts/brain/remediation-${ts}.json`, JSON.stringify({ reason: 'validation', tasks }, null, 2)); } catch { }
    if (aborted) followUps.push({ type: 'action', suggestion: 'Reduce scope or increase budget' });
  }
  await writeRunLog({ ts: Date.now(), runId, mode, tasks, domains: [...new Set(tasks.map(t => t.domain))], toolsInvoked, diffs, validation, outcome, followUps, aborted, reason: aborted ? 'budget' : 'normal', metrics: { elapsedMs: Date.now() - t0, estTokens: tokenUsed, budget: { tokenUsed, tokenBudget: cfg.budget.token, timeUsedMs: Date.now() - tStart, timeBudgetMs: cfg.budget.timeSeconds * 1000 } } });
  if (!asJson && (mode === 'execute' || mode === 'dry-run' || mode === 'auto')) {
    console.log(banner('Run Outcome') + `${cyan('Date')}: ${tsHuman}  ${cyan('Melb')}: ${melbTime} UTCΔ=${tzDiffStr}\n` +
      `${cyan('Status')}: ${outcome.status === 'OK' ? green('OK') : red('FAIL')}  ${cyan('FilesΔ')}: ${diffs.files}  ${cyan('LOCΔ')}: ${diffs.locAdded}` +
      (useOpenAI && (tokenMeta.totalTokens || tokenMeta.fallback) ? `\n${cyan('Token Usage')}: ${tokenMeta.fallback ? red('fallback') : `prompt=${promptTokens} completion=${completionTokens} total=${tokenMeta.totalTokens} estCost=$${estCost.toFixed(4)}`}` : '') +
      (validation ? `\n${cyan('Validation')}: TC=${validation.typecheck} Lint=${validation.lint} Tests=${validation.tests}` : '') +
      (followUps.length ? '\n' + cyan('FollowUps:') + '\n' + formatList(followUps, f => yellow(f.type) + dim(' ' + (f.note || f.suggestion || ''))) : '') + '\n');
  }
}

main().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
