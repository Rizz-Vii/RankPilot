// Step schema validation & normalization for planner output
import type { Task } from '../../../types/brain';

export interface RawStep { taskId?: string; id?: string; kind?: string; runners?: string[]; reason?: string; domain?: string; }
export interface NormalizedStep { taskId: string; kind: string; runners: string[]; domain: string; reason?: string; }

const VALID_KINDS = new Set(['do-task']);
const VALID_RUNNERS = new Set(['codex', 'aider']);

export function assignRunners(domain: string, requested?: string[] | undefined): string[] {
    const filtered = (requested || []).filter(r => VALID_RUNNERS.has(r));
    if (filtered.length) return filtered;
    if (/doc/i.test(domain)) return ['aider'];
    if (/front|back|infra|ops|data/.test(domain)) return ['codex'];
    return ['codex'];
}

export function normalizeSteps(raw: any[], batch: Task[]): { steps: NormalizedStep[]; errors: string[] } {
    const errors: string[] = [];
    const steps: NormalizedStep[] = [];
    const seen = new Set<string>();
    for (const r of raw as RawStep[]) {
        const taskId = r.taskId || r.id;
        if (!taskId) { errors.push('missing taskId'); continue; }
        if (seen.has(taskId)) continue; seen.add(taskId);
        const task = batch.find(b => b.id === taskId);
        const domain = r.domain || task?.domain || 'docs';
        const kind = VALID_KINDS.has(r.kind || '') ? (r.kind as string) : 'do-task';
        const runners = assignRunners(domain, r.runners);
        steps.push({ taskId, kind, runners, domain, reason: r.reason });
    }
    return { steps, errors };
}

export default { normalizeSteps, assignRunners };
