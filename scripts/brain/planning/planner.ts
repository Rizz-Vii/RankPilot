import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import type { Task } from '../../../types/brain';
import { sampleContext } from '../core/contextSampler';
import type { NormalizedStep } from './stepSchema';
import { normalizeSteps } from './stepSchema';

// Minimal shapes to avoid pervasive `any` usage.
interface MissionDiagnostics { typecheck?: { errors?: number }; lint?: { errors?: number; warnings?: number }; }
interface MissionLike { summary?: string; diagnostics?: MissionDiagnostics; immediateSteps?: { title: string; rationale: string }[] }
interface MemoryEventLike { source?: string; kind?: string; status?: string; id?: string }
export interface BrainPlan { steps: NormalizedStep[] | { kind: string; taskId: string; domain: string; contextNote?: string }[]; strategy: 'openai' | 'heuristic'; meta?: { model?: string; promptTokens?: number; completionTokens?: number; totalTokens?: number; fallback?: boolean } }

function loadMission(): MissionLike | undefined {
  try {
    const f = path.join(process.cwd(), 'artifacts/brain/currentMission.json');
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')) as MissionLike;
  } catch { /* ignore errors reading mission */ }
  return undefined;
}

function loadRecentMemory(limit = 40): MemoryEventLike[] {
  try {
    const f = path.join(process.cwd(), 'artifacts/brain/memory.jsonl');
    if (!fs.existsSync(f)) return [] as MemoryEventLike[];
    const lines = fs.readFileSync(f, 'utf8').trim().split(/\n/).slice(-limit);
    return lines
      .map(l => { try { return JSON.parse(l) as MemoryEventLike; } catch { return null; } })
      .filter((v): v is MemoryEventLike => Boolean(v));
  } catch { return []; }
}

export function plan(batch: Task[], opts?: { contextKb?: number }): BrainPlan {
  const ctx = sampleContext(opts?.contextKb ?? 8);
  const mem = loadRecentMemory();
  const mission = loadMission();
  const tsErrors = mission?.diagnostics?.typecheck?.errors;
  const lintErrors = mission?.diagnostics?.lint?.errors;
  const lintWarnings = mission?.diagnostics?.lint?.warnings;
  // Prioritize failed codex tasks from memory
  const failedIds = new Set(mem.filter(m => m.kind === 'task-complete' && m.status === 'fail').map(m => m.id).filter((v): v is string => Boolean(v)));
  const prioritized = [...batch.filter(b => failedIds.has(b.id)), ...batch.filter(b => !failedIds.has(b.id))];
  const diagNote = (tsErrors !== undefined) ? ` diag:ts=${tsErrors},lintE=${lintErrors},lintW=${lintWarnings}` : '';
  const forceCodex = process.env.BRAIN_FORCE_CODEX === '1';
  const steps = prioritized.map((t) => ({ kind: 'do-task', taskId: t.id, domain: t.domain || 'docs', contextNote: `files:${ctx.files.length}${diagNote}`, runners: forceCodex ? ['codex'] : undefined }));
  return { steps, strategy: 'heuristic' };
}

export function savePlanText(runId: string, planObj: unknown): void {
  try {
    const dir = path.join(process.cwd(), 'artifacts', 'brain');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `plan-${runId}.txt`), typeof planObj === 'string' ? planObj : JSON.stringify(planObj, null, 2));
  } catch { /* ignore write errors */ }
}

interface PlannerCfg { tools?: Record<string, unknown>; tokens?: { plannerModel?: string; temperature?: number };[k: string]: unknown }
export async function planWithOpenAI(batch: Task[], cfg: PlannerCfg, ctxKb = 8): Promise<BrainPlan> {
  // Fallback: if primary key missing but GPT5 specific present, map it (in‑process only)
  if (!process.env.OPENAI_API_KEY && process.env.OPENAI_GPT5_KEY) {
    process.env.OPENAI_API_KEY = process.env.OPENAI_GPT5_KEY;
  }
  const use = Boolean(cfg?.tools && (cfg.tools as Record<string, unknown>).openaiPlanner) && process.env.OPENAI_API_KEY && process.env.BRAIN_USE_OPENAI === '1';
  if (process.env.BRAIN_PLANNER_DEBUG === '1') {
    console.log(`[planner:openai] useFlag=${process.env.BRAIN_USE_OPENAI} keyPresent=${!!process.env.OPENAI_API_KEY} keyLen=${(process.env.OPENAI_API_KEY || '').length} gpt5Len=${(process.env.OPENAI_GPT5_KEY || '').length} orgLen=${(process.env.OPENAI_ORGANIZATION || '').length} model=${process.env.BRAIN_OPENAI_MODEL || cfg?.tokens?.plannerModel || 'gpt-4o-mini'} temp=${cfg?.tokens?.temperature ?? 0.2}`);
  }
  if (!use && process.env.BRAIN_FORCE_OPENAI_STRATEGY !== '1') return plan(batch, { contextKb: ctxKb });
  const mem = loadRecentMemory();
  const ctx = sampleContext(ctxKb);
  const mission = loadMission();
  const missionLines = mission ? [
    'Mission summary: ' + mission.summary + ` (tsErrors=${mission.diagnostics?.typecheck?.errors}, lintErrors=${mission.diagnostics?.lint?.errors}, lintWarnings=${mission.diagnostics?.lint?.warnings})`,
    'Immediate mission steps:',
    ...(mission.immediateSteps || []).slice(0, 3).map((s, i: number) => `  ${i + 1}. ${s.title} :: ${s.rationale}`)
  ] : ['Mission summary: none'];
  const prompt = [
    'You are the RankPilot Brain planner. Generate ordered atomic remediation steps.',
    'Context notes:',
    ...ctx.notes,
    ...missionLines,
    'Recent memory events:',
    ...mem.slice(-10).map(m => ` - ${m.source}:${m.kind}:${m.status || ''}:${m.id || ''}`),
    'Tasks (include a concise files array suggestion referencing likely touched repo-relative paths; omit files only if purely conceptual):',
    ...batch.map(t => ` - (${t.id}) ${t.title} [domain=${t.domain}]`),
    'Return ONLY a JSON array of steps: [{"taskId":"id","kind":"do-task","runners":["codex"],"reason":"why","files":["src/..","scripts/..." ]}]',
    'Rules:',
    ' - Prefer ≤4 files per step; if many, split into multiple steps each with ≤4 files',
    ' - Use exact existing paths; do not invent directories',
    ' - If task is documentation-only, point to relevant .md file under docs/ or README.md',
    ' - If unsure of exact file, pick the most central candidate (e.g., src/lib/..., or scripts/... )'
  ].join('\n');
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, organization: process.env.OPENAI_ORGANIZATION });
    const model = process.env.BRAIN_OPENAI_MODEL || cfg.tokens?.plannerModel || 'gpt-4o-mini';
    const temperature = cfg.tokens?.temperature ?? 0.2;
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an expert software planner. Output ONLY a JSON array of planning steps. No commentary.' },
        { role: 'user', content: prompt }
      ],
      temperature
    });
    const raw = resp.choices?.[0]?.message?.content || '';
    let text = raw.trim();
    // Strip code fences
    const fence = text.match(/```(?:json)?([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    // Attempt direct JSON parse; fall back to extracting first array substring
    let parsed: unknown[] = [];
    const tryParse = (s: string): unknown[] | undefined => { try { const v = JSON.parse(s); if (Array.isArray(v)) return v; } catch { /* ignore JSON parse errors */ } return undefined; };
    parsed = tryParse(text) || [];
    if (!parsed.length) {
      const start = text.indexOf('[');
      if (start >= 0) {
        let depth = 0; let buf = '';
        for (let i = start; i < text.length; i++) {
          const ch = text[i];
          buf += ch;
          if (ch === '[') depth++;
          else if (ch === ']') { depth--; if (depth === 0) break; }
        }
        if (buf.endsWith(']')) parsed = tryParse(buf) || [];
      }
    }
    if (!parsed.length) console.error('[planner:openai] parse-fail; rawLen=', raw.length);
    if (!Array.isArray(parsed) || !parsed.length) {
      if (process.env.BRAIN_FORCE_OPENAI_STRATEGY === '1') {
        const fb = plan(batch, { contextKb: ctxKb });
        return { steps: fb.steps as NormalizedStep[], strategy: 'openai' };
      }
      return plan(batch, { contextKb: ctxKb });
    }
    // Attach files from parsed if provided
    const parsedArr: unknown[] = Array.isArray(parsed) ? parsed : [];
    const { steps, errors } = normalizeSteps(parsedArr as unknown[], batch);
    // Map files into steps (extend NormalizedStep at runtime with files for enqueue path)
    const stepFilesMap: Record<string, string[] | undefined> = {};
    for (const p of parsedArr) {
      if (
        p && typeof p === 'object' &&
        'taskId' in (p as Record<string, unknown>) && typeof (p as { taskId?: unknown }).taskId === 'string' &&
        'files' in (p as Record<string, unknown>) && Array.isArray((p as { files?: unknown[] }).files)
      ) {
        const taskId = (p as { taskId: string }).taskId;
        const files = (p as { files: unknown[] }).files.filter((f): f is string => typeof f === 'string' && f.length < 260);
        stepFilesMap[taskId] = files;
      }
    }
    // Simple file existence filter (keep only existing or plausible src/ docs/ scripts/ paths)
    const exists = (p: string) => { try { return fs.existsSync(path.join(process.cwd(), p)); } catch { return false; } };
    for (const s of steps as Array<NormalizedStep & { files?: string[] }>) {
      const cand = stepFilesMap[s.taskId];
      if (cand && cand.length) {
        s.files = cand.filter(f => /^(src|scripts|docs|functions|package\.json|README\.md)/.test(f) && (exists(f) || /package\.json|README\.md$/.test(f))).slice(0, 4);
      }
    }
    if (process.env.BRAIN_PLANNER_DEBUG === '1' && errors.length) {
      console.warn('[planner:openai] step schema issues:', errors.join('; '));
    }
    const usage = resp.usage || {} as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    const meta = { model, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens };
    return { steps, strategy: 'openai', meta };
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? (e as { message?: string }).message : String(e);
    console.error('[planner:openai] error -> fallback:', msg);
    if (process.env.BRAIN_FORCE_OPENAI_STRATEGY === '1') {
      const fb = plan(batch, { contextKb: ctxKb });
      return { steps: fb.steps as NormalizedStep[], strategy: 'openai', meta: { fallback: true, model: (process.env.BRAIN_OPENAI_MODEL as string) || (cfg as PlannerCfg).tokens?.plannerModel || 'gpt-4o-mini' } };
    }
    return plan(batch, { contextKb: ctxKb });
  }
}

export default { plan };
