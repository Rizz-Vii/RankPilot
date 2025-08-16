import type { Task } from '../../../types/brain';
import { sampleContext } from '../core/contextSampler';
import fs from 'fs';
import path from 'path';

export function plan(batch: Task[], opts?: { contextKb?: number }): { steps: any[]; strategy: 'openai' | 'heuristic' } {
  const ctx = sampleContext(opts?.contextKb ?? 8);
  const steps = batch.map((t) => ({ kind: 'do-task', taskId: t.id, domain: t.domain || 'docs', contextNote: `files:${ctx.files.length}` }));
  return { steps, strategy: 'heuristic' };
}

export function savePlanText(runId: string, planObj: any) {
  try {
    const dir = path.join(process.cwd(), 'artifacts', 'brain');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `plan-${runId}.txt`), typeof planObj === 'string' ? planObj : JSON.stringify(planObj, null, 2));
  } catch {}
}

export async function planWithOpenAI(batch: Task[], cfg: any, ctxKb = 8): Promise<{ steps: any[]; strategy: 'openai' | 'heuristic' }> {
  const use = cfg?.tools?.openaiPlanner && process.env.OPENAI_API_KEY;
  // No external calls; gracefully fall back
  if (!use) return plan(batch, { contextKb: ctxKb });
  // Stubbed: return heuristic-shaped plan but mark strategy as 'heuristic' to avoid misreporting
  return plan(batch, { contextKb: ctxKb });
}

export default { plan };
