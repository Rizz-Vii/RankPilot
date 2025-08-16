import type { Task } from '../../../types/brain';
import { getRunnersFor } from './toolRegistry';
import { checkBatchLimits } from '../governance/guards';
import fs from 'fs';
import { execSync } from 'child_process';

function computeDiffStats(): { files: number; locAdded: number } {
  try {
    const out = execSync('git diff --numstat', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    let files = 0, loc = 0;
    out.split(/\n/).filter(Boolean).forEach((line) => { const parts = line.split(/\t/); if (parts.length >= 2) { files++; const n = parseInt(parts[0], 10); if (!isNaN(n)) loc += n; } });
    return { files, locAdded: Math.max(0, loc) };
  } catch { return { files: 0, locAdded: 0 }; }
}

function writeRemediation(reason: string, tasks: Task[], metrics?: { batchCount?: number; estTokens?: number; elapsedMs?: number; budgetInfo?: any }) {
  try {
    fs.mkdirSync('artifacts/brain', { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const payload: any = { reason, tasks };
    if (metrics) {
      payload.metrics = metrics;
    }
    fs.writeFileSync(`artifacts/brain/remediation-${ts}.json`, JSON.stringify(payload, null, 2));
  } catch {}
}

export async function runBatch(tasks: Task[], opts: { mode: 'execute' | 'dry-run' | 'plan-only'; cfg: any; preflightEstimate?: { files: number; locAdded: number } }): Promise<{ results: any[]; diffs: { files: number; locAdded: number } }> {
  const results: any[] = [];
  if (opts.mode !== 'execute') return { results, diffs: { files: 0, locAdded: 0 } };
  // Pre-flight guard estimate (placeholder 0 for now)
  const estimate = opts.preflightEstimate || { files: 0, locAdded: 0 };
  const guard = (opts.cfg && opts.cfg.limits) ? checkBatchLimits(estimate, opts.cfg.limits) : { ok: true };
  if (!guard.ok) { writeRemediation('limits', tasks); return { results, diffs: estimate }; }
  for (const t of tasks) {
    const runners = getRunnersFor(t.domain || 'docs', opts.cfg);
    for (const r of runners) {
      const out = await r.run({ taskId: t.id }, { cfg: opts.cfg });
      results.push({ taskId: t.id, tool: r.name, ok: !!out?.ok, note: out?.note || 'stub' });
    }
  }
  const diffs = computeDiffStats();
  return { results, diffs };
}

export default { runBatch };
