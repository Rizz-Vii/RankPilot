import type { Task } from '../../types/brain';
import { classifyBatch } from './core/classification';
import { checkBatchLimits } from './governance/guards';
import { writeRunLog } from './state/logWriter';
import { loadConfig, validateConfig } from './config';

export async function runBaseline(sample?: Task[]) {
  const cfg = loadConfig();
  const valid = validateConfig(cfg);
  if (!valid.ok) throw new Error('config invalid: ' + (valid.errors || []).join(','));
  const tasks = sample || [{ id: 'demo-1', title: 'Demo task', raw: 'demo', domain: 'docs', status: 'TODO' }];
  const classified = classifyBatch(tasks);
  const guard = checkBatchLimits({ locAdded: 0, files: 0 }, cfg.limits);
  const run = { ts: new Date().toISOString(), runId: `baseline-${Date.now()}`, mode: 'plan-only', limits: cfg.limits, ok: guard.ok };
  writeRunLog(run);
  return { ok: guard.ok, files: 0, locAdded: 0, classified };
}

export default { runBaseline };
