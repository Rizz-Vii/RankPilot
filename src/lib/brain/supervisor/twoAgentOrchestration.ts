// Two-Agent Orchestration Prototype (Supervisor + Refactorer + Reviewer)
// This lightweight module integrates with existing delegation queue to demonstrate
// a supervisor-driven refinement loop for lint/type issues.

import { execSync } from 'child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';
// Import queue utils dynamically to remain environment agnostic.
type DelegationQueueTask = { taskId: string; summary: string; files: string[]; status: 'pending' | 'running' | 'done' | 'failed' | string; createdAt: string; updatedAt: string; notes?: string };
// Lightweight dynamic import (falls back to global shim if present)
// Avoid static require to satisfy lint rule while preserving runtime flexibility.
// Lightweight module shape (avoid import() type to satisfy consistent-type-imports rule)
type GenericQueueTask = { taskId: string; summary: string; files: string[]; status: string; createdAt: string; updatedAt: string; notes?: string };
// Safe global shim access without explicit any casts
interface QueueShim {
    __QUEUE_UTILS__?: {
        readQueue?: () => DelegationQueueTask[];
        appendTask?: (t: DelegationQueueTask) => void;
    };
}
let readQueue: () => DelegationQueueTask[];
let appendTask: (t: DelegationQueueTask) => void;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const qu = require(path.resolve('scripts/delegation/queue-utils.ts'));
    readQueue = qu.readQueue;
    appendTask = (t: DelegationQueueTask) => qu.appendTask(t as unknown as GenericQueueTask);
} catch {
    readQueue = () => {
        const g = globalThis as QueueShim;
        return g.__QUEUE_UTILS__?.readQueue?.() || [];
    };
    appendTask = (t: DelegationQueueTask) => {
        const g = globalThis as QueueShim;
        g.__QUEUE_UTILS__?.appendTask?.(t as unknown as GenericQueueTask);
    };
}

interface AnalysisIssue {
    file: string;
    rule: string;
    message: string;
    line?: number;
    severity: 'error' | 'warning';
}

interface ReviewerPlanTask {
    taskId: string;
    summary: string;
    files: string[];
    rule: string;
    severity: 'error' | 'warning';
    count: number;
    fixable?: boolean;
}

// Priority weights (higher = earlier). Broader buckets map to numeric tiers.
// Security & correctness emphasized over style.
const RULE_PRIORITY: Record<string, number> = {
    // Security / hazardous
    'no-eval': 100,
    'no-implied-eval': 100,
    'no-new-func': 95,
    // Correctness / runtime safety
    'no-floating-promises': 90,
    '@typescript-eslint/no-floating-promises': 90,
    '@typescript-eslint/no-misused-promises': 88,
    'no-undef': 85,
    'no-unreachable': 82,
    // Type safety / maintainability
    '@typescript-eslint/no-explicit-any': 70,
    '@typescript-eslint/no-unused-vars': 68,
    'no-unused-vars': 65,
    '@typescript-eslint/consistent-type-imports': 55,
    // Performance / potential bloat
    'no-shadow': 50,
    // Style / minor
    'prefer-const': 20,
    'no-extra-semi': 15,
    'prettier/prettier': 10
};

const LAST_HASH_FILE = '.codex/tmp/two-agent-last-hash.txt';
const LAST_ORDER_FILE = '.codex/tmp/two-agent-last-order.json';

function ensureParentDir(filePath: string) {
    try {
        const dir = path.dirname(filePath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    } catch { /* ignore */ }
}

/** Reviewer: combine ESLint JSON + optional TypeScript diagnostics into prioritized task buckets. */
export function reviewerEmitTasks(options: { maxTasks?: number; includeWarnings?: boolean } = {}): ReviewerPlanTask[] {
    const { maxTasks = 5, includeWarnings = false } = options;
    const lintReportPath = path.resolve(process.env.TWO_AGENT_LINT_REPORT_PATH || 'artifacts/eslint-report.json');
    const tscDiagPath = path.resolve(process.env.TWO_AGENT_TSC_DIAGNOSTICS_PATH || 'artifacts/tsc-diagnostics.json');
    const combined: ReviewerPlanTask[] = [];
    const lintTasks: ReviewerPlanTask[] = [];
    const tsTasks: ReviewerPlanTask[] = [];
    // ESLint portion
    if (existsSync(lintReportPath)) {
        try {
            const raw = JSON.parse(readFileSync(lintReportPath, 'utf8') || '[]');
            if (Array.isArray(raw)) {
                interface ESLintMessage { ruleId?: string; message?: string; line?: number; severity?: number; fix?: unknown }
                interface ESLintFileEntry { filePath?: string; messages?: ESLintMessage[] }
                const grouped = new Map<string, { issues: AnalysisIssue[]; fixable: boolean }>();
                for (const entryUnknown of raw as unknown[]) {
                    const entry = entryUnknown as ESLintFileEntry;
                    if (!entry || typeof entry !== 'object') continue;
                    const file = typeof entry.filePath === 'string' ? entry.filePath : undefined;
                    if (!file) continue;
                    const msgs = Array.isArray(entry.messages) ? entry.messages : [];
                    for (const msgUnknown of msgs) {
                        const m = msgUnknown as ESLintMessage;
                        if (!m || typeof m !== 'object') continue;
                        const rule = m.ruleId || 'unknown';
                        const severity: 'error' | 'warning' = m.severity === 2 ? 'error' : 'warning';
                        if (severity === 'warning' && !includeWarnings) continue;
                        const key = `${file}::${rule}`;
                        const bucket = grouped.get(key) || { issues: [] as AnalysisIssue[], fixable: false };
                        bucket.issues.push({ file, rule, message: m.message || '', line: m.line, severity });
                        if (m.fix) bucket.fixable = true;
                        grouped.set(key, bucket);
                    }
                }
                for (const [key, bucket] of grouped.entries()) {
                    const [file, rule] = key.split('::');
                    const severity = bucket.issues.some(issue => issue.severity === 'error') ? 'error' : 'warning';
                    const task: ReviewerPlanTask = {
                        taskId: `AI-LINT-${rule}-${Math.abs(hashCode(file)) % 10000}`,
                        summary: `Resolve ${rule}${bucket.fixable ? ' (fixable)' : ''} in ${path.basename(file)} (${bucket.issues.length} occurrences)` + (severity === 'error' ? ' [error]' : ''),
                        files: [file],
                        rule,
                        severity,
                        count: bucket.issues.length,
                        fixable: bucket.fixable
                    };
                    lintTasks.push(task);
                    combined.push(task);
                }
            }
        } catch { /* ignore */ }
    }
    // TypeScript diagnostics portion
    if (existsSync(tscDiagPath)) {
        try {
            const raw = JSON.parse(readFileSync(tscDiagPath, 'utf8') || '[]');
            if (Array.isArray(raw)) {
                interface RawTSDiag { file?: unknown; code?: unknown; }
                const grouped = new Map<string, number>();
                for (const d of raw as RawTSDiag[]) {
                    if (!d || typeof d !== 'object') continue;
                    const file = typeof d.file === 'string' ? d.file : undefined;
                    if (!file) continue;
                    const codeNum = typeof d.code === 'number' ? d.code : Number(d.code);
                    const code = Number.isFinite(codeNum) ? `TS${codeNum}` : 'TSC';
                    const key = `${file}::${code}`;
                    grouped.set(key, (grouped.get(key) || 0) + 1);
                }
                for (const [key, count] of grouped) {
                    const [file, rule] = key.split('::');
                    const task: ReviewerPlanTask = {
                        taskId: `AI-TSC-${rule}-${Math.abs(hashCode(file)) % 10000}`,
                        summary: `Fix TypeScript ${rule} diagnostics in ${path.basename(file)} (${count}) [error]`,
                        files: [file],
                        rule: rule || 'TSC',
                        severity: 'error',
                        count,
                        fixable: false
                    };
                    tsTasks.push(task);
                    combined.push(task);
                }
            }
        } catch { /* ignore */ }
    }
    // Optional batching of TS tasks when many (env toggle)
    if (process.env.TWO_AGENT_TSC_BATCH === '1') {
        const BATCH_RULE_MIN = Number(process.env.TWO_AGENT_TSC_BATCH_MIN || 4);
        const MAX_FILES_PER_BATCH = Number(process.env.TWO_AGENT_TSC_BATCH_MAX_FILES || 3);
        const byRule = new Map<string, ReviewerPlanTask[]>();
        for (const t of tsTasks) {
            const list = byRule.get(t.rule) || [];
            list.push(t); byRule.set(t.rule, list);
        }
        for (const [rule, tasksForRule] of byRule) {
            if (tasksForRule.length >= BATCH_RULE_MIN) {
                // Sort by count desc and take top N files
                const top = [...tasksForRule].sort((a, b) => b.count - a.count).slice(0, MAX_FILES_PER_BATCH);
                if (top.length > 1) {
                    // Remove individual tasks (will be replaced by batch)
                    for (const t of top) {
                        const idx = combined.indexOf(t);
                        if (idx >= 0) combined.splice(idx, 1);
                    }
                    const files = top.map(t => t.files[0]);
                    const total = top.reduce((s, t) => s + t.count, 0);
                    combined.push({
                        taskId: `AI-TSCB-${rule}-${Math.abs(hashCode(files.join('|'))) % 10000}`,
                        summary: `Fix batched TypeScript ${rule} diagnostics in ${files.length} files (${total} total) [error][batch]`,
                        files,
                        rule,
                        severity: 'error',
                        count: total,
                        fixable: false
                    });
                }
            }
        }
    }
    // Apply priority: rule base weight + fixable boost
    const FIXABLE_BOOST = 8;
    const tasks = combined.sort((a, b) => {
        const wa = (RULE_PRIORITY[a.rule] ?? (a.rule.startsWith('TS') ? 75 : 30)) + (a.fixable ? FIXABLE_BOOST : 0);
        const wb = (RULE_PRIORITY[b.rule] ?? (b.rule.startsWith('TS') ? 75 : 30)) + (b.fixable ? FIXABLE_BOOST : 0);
        if (wb !== wa) return wb - wa;
        if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.taskId.localeCompare(b.taskId);
    });
    // Ensure at least one lint task if any exist (sampling) to avoid pure TS cycles
    // If returning full sorted list (rotation / advanced planner), bypass slicing & lint inclusion reshuffle.
    if (process.env.TWO_AGENT_PLAN_RETURN_ALL === '1') return tasks;
    const top = tasks.slice(0, maxTasks);
    const hasLint = top.some(t => t.taskId.startsWith('AI-LINT-'));
    if (!hasLint) {
        const candidate = tasks.find(t => t.taskId.startsWith('AI-LINT-'));
        if (candidate) {
            if (!top.some(t => t.taskId === candidate.taskId)) {
                top[top.length - 1] = candidate;
            }
        }
    }
    return top;
}

/** Supervisor ingests reviewer tasks and enqueues them into existing delegation queue if not already present. */
export function supervisorEnqueueReviewerTasks(tasks: ReviewerPlanTask[]): number {
    if (!tasks.length) return 0;
    const queue = readQueue();
    const churnMinutes = Number(process.env.TWO_AGENT_FILE_CHURN_MINUTES || 10);
    const churnCutoff = Date.now() - churnMinutes * 60_000;
    const allowRequeue = process.env.TWO_AGENT_ALLOW_REQUEUE === '1';
    let added = 0;
    for (const t of tasks) {
        const existing = queue.find(q => q.taskId === t.taskId);
        if (existing) {
            if (allowRequeue && (existing.status === 'done' || existing.status === 'failed')) {
                // Derive a new taskId with lightweight generation suffix; preserve deterministic core for grouping.
                const baseId = t.taskId.replace(/-R\d+$/, '');
                t.taskId = `${baseId}-R${Date.now() % 100000}`; // modulo keeps id short
            } else {
                continue; // skip duplicate when not requeueing
            }
        }
        // File-level churn guard: skip very recently modified files to reduce thrash
        try {
            const f = t.files[0];
            if (f && existsSync(f)) {
                const stat = statSync(f);
                if (stat.mtimeMs > churnCutoff) {
                    console.log(`[two-agent] skip (churn guard) ${t.taskId} recent mtime`);
                    continue;
                }
            }
        } catch { /* ignore */ }
        appendTask({
            taskId: t.taskId,
            summary: t.summary,
            files: t.files,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        added++;
    }
    if (added) {
        appendFileSync(path.resolve('metrics-snapshots.log'), `twoAgentEnqueue ${Date.now()} added=${added}\n`);
    }
    return added;
}

/** Simple hash function for deterministic small IDs */
function hashCode(str: string): number {
    let h = 0, i = 0, len = str.length;
    while (i < len) { h = (h << 5) - h + str.charCodeAt(i++) | 0; }
    return h;
}

/** One-shot orchestration: reviewer -> supervisor enqueue */
export async function runTwoAgentLintCycle(opts?: { maxTasks?: number; includeWarnings?: boolean }): Promise<{ planned: number; drift?: number; adaptiveMax?: number; considered: number; skippedDueToHash?: boolean; taskIds?: string[] }> {
    // Behavior-controlling env flags (runtime):
    //  - TWO_AGENT_FORCE_REPLAN=1            : Ignore unchanged hash once (every iteration) and always enqueue if tasks available.
    //  - TWO_AGENT_FORCE_REPLAN_AFTER=N      : Every N iterations bypass hash comparison.
    //  - TWO_AGENT_ALLOW_REQUEUE=1           : Re-enqueue previously done/failed tasks with a regenerated taskId suffix (-Rxxxxx).
    //  - TWO_AGENT_SKIP_PREGEN=1             : Skip lint/ts diagnostics regeneration (use existing artifacts).
    // Pre-step: ensure fresh artifacts (ESLint + TS) unless disabled
    if (process.env.TWO_AGENT_SKIP_PREGEN !== '1') {
        const extractErr = (err: unknown): string => (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string')
            ? (err as { message: string }).message
            : String(err);
        try { execSync('npm run lint:report:json --silent', { stdio: 'pipe' }); } catch (e) { console.warn('[two-agent] pregen eslint report failed', extractErr(e)); }
        try { execSync('npm run diagnostics:tsc:json --silent', { stdio: 'pipe' }); } catch (e) { console.warn('[two-agent] pregen tsc diagnostics failed', extractErr(e)); }
    }
    let requestedMax = opts?.maxTasks ?? Number(process.env.TWO_AGENT_MAX_TASKS || 5);
    let plan = reviewerEmitTasks(opts);
    let considered = plan.length;
    let offsetUsed = 0;
    // Advanced rotation path: request full plan & rotate window while skipping completed tasks
    if (process.env.TWO_AGENT_PLAN_RETURN_ALL === '1') {
        const full = plan; // full sorted
        const queue = readQueue();
        const allowRequeue = process.env.TWO_AGENT_ALLOW_REQUEUE === '1';
        const skipDone = process.env.TWO_AGENT_SKIP_DONE !== '0';
        const doneSet = new Set(queue.filter(q => (q.status === 'done' || q.status === 'failed')).map(q => q.taskId));
        let filtered = full.filter(t => allowRequeue ? true : !(skipDone && doneSet.has(t.taskId)));
        if (!filtered.length) {
            filtered = full; // nothing left – fall back to full to allow requeue logic or repeat processing
        }
        // Rotation offset
        const offsetFile = '.codex/tmp/two-agent-plan-offset.txt';
        try {
            if (!existsSync(path.dirname(offsetFile))) mkdirSync(path.dirname(offsetFile), { recursive: true });
        } catch { /* ignore */ }
        try { offsetUsed = Number(readFileSync(offsetFile, 'utf8')) || 0; } catch { offsetUsed = 0; }
        if (offsetUsed >= filtered.length) offsetUsed = 0;
        // Select window
        const window: ReviewerPlanTask[] = [];
        for (let i = 0; i < requestedMax && filtered.length; i++) {
            window.push(filtered[(offsetUsed + i) % filtered.length]);
        }
        offsetUsed = (offsetUsed + requestedMax) % filtered.length;
        try { writeFileSync(offsetFile, String(offsetUsed)); } catch { /* ignore */ }
        plan = window;
        considered = filtered.length;
    }
    let drift: number | undefined;
    // Optional planner reordering with OpenAI / Agents (env toggle)
    if (process.env.TWO_AGENT_PLANNER === '1' && plan.length) {
        try {
            const orderedRules = await planRulesWithAgents(plan.map(p => ({ rule: p.rule, count: p.count })));
            if (orderedRules && orderedRules.length) {
                const prevOrder: string[] | undefined = existsSync(LAST_ORDER_FILE)
                    ? JSON.parse(readFileSync(LAST_ORDER_FILE, 'utf8') || '[]')
                    : undefined;
                const rank = new Map(orderedRules.map((r, i) => [r, i]));
                plan = [...plan].sort((a, b) => {
                    const ra = rank.get(a.rule) ?? 9999;
                    const rb = rank.get(b.rule) ?? 9999;
                    return ra - rb;
                });
                if (prevOrder && prevOrder.length) {
                    const union = Array.from(new Set([...prevOrder, ...orderedRules]));
                    const prevPos = new Map(prevOrder.map((r, i) => [r, i] as const));
                    const currPos = new Map(orderedRules.map((r, i) => [r, i] as const));
                    let total = 0;
                    for (const r of union) {
                        const a = prevPos.get(r);
                        const b = currPos.get(r);
                        if (a != null && b != null) total += Math.abs(a - b);
                    }
                    drift = union.length ? total / union.length : 0;
                }
                try {
                    ensureParentDir(LAST_ORDER_FILE);
                    writeFileSync(LAST_ORDER_FILE, JSON.stringify(orderedRules), 'utf8');
                } catch { /* ignore */ }
            }
        } catch (e) {
            const msg = (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') ? (e as { message: string }).message : String(e);
            console.warn('[two-agent] planner integration failed; falling back', msg);
        }
    }
    // Adaptive max tasks based on drift (higher drift -> reduce batch size to observe stability)
    let adaptiveMax = requestedMax;
    const driftThreshold = Number(process.env.TWO_AGENT_DRIFT_THRESHOLD || 1.5);
    if (drift !== undefined && drift > driftThreshold) {
        adaptiveMax = Math.max(1, Math.ceil(requestedMax / 2));
    }
    // Autoscale: if both TS & LINT tasks present and drift low, optionally expand working ground
    const autoscale = process.env.TWO_AGENT_AUTOSCALE !== '0';
    if (autoscale && drift !== undefined && drift <= driftThreshold && plan.some(t => t.taskId.startsWith('AI-LINT-')) && plan.some(t => t.taskId.startsWith('AI-TSC'))) {
        const cap = Number(process.env.TWO_AGENT_AUTOSCALE_CAP || 10);
        requestedMax = Math.min(cap, requestedMax + 2); // modest expansion
        adaptiveMax = Math.min(adaptiveMax + 2, requestedMax);
    }
    if (plan.length > adaptiveMax) plan = plan.slice(0, adaptiveMax);
    // Codex tagging: allow certain tasks (TS diagnostics or batched TS) to be prefixed for codex loop execution.
    // Controlled by TWO_AGENT_CODEX_TS (default enabled) and capped by TWO_AGENT_CODEX_MAX_PER_BATCH.
    try {
        const enableCodex = process.env.TWO_AGENT_CODEX_TS !== '0';
        if (enableCodex) {
            const maxCodex = Math.max(0, Number(process.env.TWO_AGENT_CODEX_MAX_PER_BATCH || 2));
            let tagged = 0;
            for (const t of plan) {
                if (tagged >= maxCodex) break;
                const isTS = t.rule.startsWith('TS');
                const isBatch = /\[batch]/i.test(t.summary);
                if (isTS || isBatch) {
                    if (!t.summary.startsWith('[CODEX]')) {
                        t.summary = `[CODEX] ${t.summary}`;
                        tagged++;
                    }
                }
            }
        }
    } catch { /* ignore codex tagging errors */ }
    // Hash plan to prevent churn (include occurrence counts and adaptive max)
    const hashPayload = plan.map(t => `${t.taskId}:${t.count}`).join('|') + `#${adaptiveMax}#off${offsetUsed}`;
    const hash = String(hashCode(hashPayload));
    const forceReplan = process.env.TWO_AGENT_FORCE_REPLAN === '1' || false;
    const forceReplanAfter = Number(process.env.TWO_AGENT_FORCE_REPLAN_AFTER || 0);
    const iterationFile = '.codex/tmp/two-agent-plan-iteration.txt';
    let iterationCount = 0;
    try { if (existsSync(iterationFile)) iterationCount = Number(readFileSync(iterationFile, 'utf8')) || 0; } catch { /* ignore */ }
    iterationCount++;
    try { ensureParentDir(iterationFile); writeFileSync(iterationFile, String(iterationCount)); } catch { /* ignore */ }
    try {
        const prev = existsSync(LAST_HASH_FILE) ? readFileSync(LAST_HASH_FILE, 'utf8').trim() : '';
        const bypassHash = forceReplan || (forceReplanAfter > 0 && iterationCount % forceReplanAfter === 0);
        if (!bypassHash && prev === hash) {
            if (drift !== undefined) {
                appendFileSync(path.resolve('metrics-snapshots.log'), `twoAgentPlannerDrift ${Date.now()} drift=${drift.toFixed(3)} unchangedHash=1\n`);
            }
            return { planned: 0, drift, adaptiveMax, considered, skippedDueToHash: true, taskIds: [] };
        }
        ensureParentDir(LAST_HASH_FILE);
        writeFileSync(LAST_HASH_FILE, hash, { encoding: 'utf8', flag: 'w' });
    } catch { /* ignore hash persistence errors */ }
    // Optional skip-existing filter (exclude any task whose ID already present in queue, regardless status)
    if (process.env.TWO_AGENT_SKIP_EXISTING === '1') {
        try {
            const existingIds = new Set(readQueue().map(q => q.taskId));
            const before = plan.length;
            plan = plan.filter(t => !existingIds.has(t.taskId));
            if (plan.length !== before) {
                considered = Math.max(considered, before); // preserve higher considered window for metrics
            }
        } catch { /* ignore */ }
    }
    if (!plan.length) {
        return { planned: 0, drift, adaptiveMax, considered, skippedDueToHash: false, taskIds: [] };
    }
    const added = supervisorEnqueueReviewerTasks(plan);
    const timestamp = Date.now();
    if (drift !== undefined) {
        appendFileSync(path.resolve('metrics-snapshots.log'), `twoAgentPlannerDrift ${timestamp} drift=${drift.toFixed(3)} adaptiveMax=${adaptiveMax} planned=${added}\n`);
    }
    // Trend line JSONL (lightweight): timestamp, planned, drift, considered, adaptiveMax
    try {
        appendFileSync('.codex/tmp/two-agent-trends.jsonl', JSON.stringify({ t: timestamp, planned: added, drift, considered, adaptiveMax }) + '\n');
    } catch { /* ignore */ }
    return { planned: added, drift, adaptiveMax, considered, taskIds: plan.map(p => p.taskId) };
}

/** Planner stub using OpenAI Agents SDK to prioritize rule categories.
 * Currently synchronous (no network) placeholder: real implementation can asynchronously
 * call an agent that classifies rules into buckets. To avoid network side-effects here,
 * we return a deterministic ordering using priority map enriched by heuristic grouping.
 */
async function planRulesWithAgents(rules: { rule: string; count: number }[]): Promise<string[]> {
    const aggregated = new Map<string, number>();
    for (const r of rules) aggregated.set(r.rule, (aggregated.get(r.rule) || 0) + r.count);
    const list = Array.from(aggregated.entries()).map(([rule, count]) => ({ rule, count }));
    // Fallback deterministic ordering
    const fallback = [...list]
        .sort((a, b) => {
            const wa = RULE_PRIORITY[a.rule] ?? 30;
            const wb = RULE_PRIORITY[b.rule] ?? 30;
            if (wb !== wa) return wb - wa;
            if (b.count !== a.count) return b.count - a.count; // higher count first
            return a.rule.localeCompare(b.rule);
        })
        .map(r => r.rule);
    if (!process.env.OPENAI_API_KEY) return fallback;
    const retries = Number(process.env.TWO_AGENT_PLANNER_RETRIES || 2);
    const baseDelay = Number(process.env.TWO_AGENT_PLANNER_BACKOFF_MS || 300);
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            let ordered: string[] | null = null;
            // Attempt Agents SDK first
            try {
                const agentsUnknown = await import('@openai/agents');
                interface AgentsClientLike { responses?: { create: (args: { model: string; input: string }) => Promise<unknown> } }
                const agentsMod = agentsUnknown as { AgentsClient?: new (cfg: { apiKey: string }) => AgentsClientLike };
                const maybeClient = agentsMod?.AgentsClient ? new agentsMod.AgentsClient({ apiKey: process.env.OPENAI_API_KEY as string }) : null;
                if (maybeClient && maybeClient.responses?.create) {
                    const content = list.map(l => `${l.rule}:${l.count}`).join('\n');
                    const response = await maybeClient.responses.create({
                        model: process.env.TWO_AGENT_PLANNER_MODEL || 'gpt-4.1-mini',
                        input: `Rank ESLint rules by remediation priority (security > correctness > type safety > performance > style). Return ONLY JSON array of rule ids in descending priority. Rules with counts:\n${content}`
                    });
                    const text = JSON.stringify(response);
                    const match = text.match(/\[[^\]]+\]/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        if (Array.isArray(parsed)) ordered = parsed.filter(r => typeof r === 'string');
                    }
                }
            } catch { /* ignore agent SDK errors */ }
            if (!ordered) {
                const openaiMod = await import('openai');
                interface OpenAIChatCompletionResult { choices: Array<{ message?: { content?: string } }> }
                const OpenAICtor = (openaiMod as { OpenAI: new (cfg: { apiKey: string }) => { chat: { completions: { create: (args: { model: string; messages: { role: string; content: string }[]; temperature: number }) => Promise<OpenAIChatCompletionResult> } } } }).OpenAI;
                const client = new OpenAICtor({ apiKey: process.env.OPENAI_API_KEY as string });
                const content = list.map(l => `${l.rule}:${l.count}`).join('\n');
                const prompt = `You are a lint remediation planner. Given ESLint rule buckets with counts, output ONLY a JSON array (no commentary) of rule ids sorted highest priority first. Priorities: security > correctness > type safety > performance > style. Data:\n${content}`;
                const completion = await client.chat.completions.create({
                    model: process.env.TWO_AGENT_PLANNER_MODEL || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'Return strictly JSON array of rule ids.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0
                });
                const text = completion.choices[0]?.message?.content || '';
                const match = text.match(/\[[^\]]*\]/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    if (Array.isArray(parsed)) ordered = parsed.filter(r => typeof r === 'string');
                }
            }
            if (!ordered || !ordered.length) throw new Error('empty-ordering');
            const known = new Set(ordered);
            for (const r of fallback) if (!known.has(r)) ordered.push(r);
            return Array.from(new Set(ordered));
        } catch (err) {
            lastError = err;
            if (attempt < retries) await sleep(baseDelay * Math.pow(2, attempt));
        }
    }
    const lastMsg = (lastError && typeof lastError === 'object' && 'message' in lastError && typeof (lastError as { message?: unknown }).message === 'string') ? (lastError as { message: string }).message : String(lastError);
    console.warn('[two-agent] planner retries exhausted, using fallback', lastMsg);
    return fallback;
}

// Execute when invoked directly via ts-node / node
if (process.argv[1] && /twoAgentOrchestration\.(t|j)s$/.test(process.argv[1])) {
    void (async () => {
        const res = await runTwoAgentLintCycle({ maxTasks: Number(process.env.TWO_AGENT_MAX_TASKS || 5), includeWarnings: false });
        const output = { timestamp: new Date().toISOString(), phase: 'two-agent-cycle', ...res };
        process.stdout.write(`${JSON.stringify(output)}\n`);
    })();
}
