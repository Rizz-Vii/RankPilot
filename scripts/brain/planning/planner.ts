import type { Task } from '../../../types/brain';
import { sampleContext } from '../core/contextSampler';

export function plan(batch: Task[], opts?: { contextKb?: number }): { steps: any[]; strategy: 'openai' | 'heuristic' } {
  const ctx = sampleContext(opts?.contextKb ?? 8);
  const steps = batch.map((t) => ({ kind: 'do-task', taskId: t.id, domain: t.domain || 'docs', contextNote: `files:${ctx.files.length}` }));
  return { steps, strategy: 'heuristic' };
}

export default { plan };
