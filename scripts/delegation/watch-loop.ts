// @ts-nocheck
/* Autonomous delegation watch loop (lightweight) */
import { spawn, spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const QUEUE = path.resolve('sessions/aider-queue.jsonl');
const LOG = path.resolve('sessions/aider-log.jsonl');
const INTERVAL_BASE = 15000; // 15s base
let running = false;
let lastHash = '';
let lastPlanHash = '';

// ANSI color helpers (fallback to plain if NO_COLOR set)
const COLOR = process.env.NO_COLOR ? { r: '', y: '', g: '', b: '', dim: '', reset: '' } : {
    r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', b: '\x1b[36m', dim: '\x1b[2m', reset: '\x1b[0m'
};

// Using JSDoc typedef so file can run under plain node without ts-node preloader
/**
 * @typedef {Object} QueueTask
 * @property {string} taskId
 * @property {string} status
 * @property {string=} updatedAt
 * @property {string=} createdAt
 * @property {string=} summary
 */

/** @param {QueueTask[]} tasks */
function categorize(tasks /**: any[] */) {
    const groups = { running: [] as any[], failed: [] as any[], done: [] as any[], pending: [] as any[] };
    for (const t of tasks) {
        if (t.status === 'running') groups.running.push(t);
        else if (t.status === 'failed') groups.failed.push(t);
        else if (t.status === 'done') groups.done.push(t);
        else groups.pending.push(t);
    }
    return groups;
}

function ageSec(ts?: string) {
    if (!ts) return 0; const d = Date.parse(ts); if (isNaN(d)) return 0; return (Date.now() - d) / 1000;
}

/** @param {QueueTask} t @param {number} staleThresholdSec */
function fmtTask(t /**: any */, staleThresholdSec /**: number */) {
    const a = ageSec(t.updatedAt);
    const stale = t.status === 'running' && a > staleThresholdSec;
    const color = t.status === 'failed' ? COLOR.r : t.status === 'running' ? (stale ? COLOR.r : COLOR.y) : t.status === 'done' ? COLOR.g : COLOR.b;
    const ageLabel = a ? `${Math.round(a)}s` : '-';
    return `${color}${t.taskId}${stale ? '*' : ''}${COLOR.reset}${COLOR.dim}[${t.status},${ageLabel}]${COLOR.reset}`;
}

/** @param {QueueTask[]} tasks */
function renderSnapshot(tasks /**: any[] */) {
    const groups = categorize(tasks as any[]);
    const total = tasks.length;
    const staleThresholdSec = Number(process.env.DELEGATE_STALE_SEC || 180); // 3 min default
    const summary = `${COLOR.dim}Σ=${total}${COLOR.reset} ${COLOR.y}R=${groups.running.length}${COLOR.reset} ${COLOR.r}F=${groups.failed.length}${COLOR.reset} ${COLOR.g}D=${groups.done.length}${COLOR.reset} ${COLOR.b}P=${groups.pending.length}${COLOR.reset}`;
    const parts: string[] = [];
    const verbose = process.env.DELEGATE_VERBOSE === '1';
    /** @param {string} label @param {QueueTask[]} arr */
    const show = (label /**: string */, arr /**: any[] */) => {
        if (!arr.length) return;
        const list = arr.slice(0, verbose ? arr.length : 6).map(t => fmtTask(t, staleThresholdSec)).join(', ');
        const more = !verbose && arr.length > 6 ? ` …(+${arr.length - 6})` : '';
        parts.push(`${label}: ${list}${more}`);
    };
    show(`${COLOR.y}Running${COLOR.reset}`, groups.running);
    show(`${COLOR.r}Failed${COLOR.reset}`, groups.failed);
    show(`${COLOR.b}Pending${COLOR.reset}`, groups.pending);
    show(`${COLOR.g}Done${COLOR.reset}`, groups.done);
    const staleRunning = groups.running.filter(t => ageSec(t.updatedAt) > staleThresholdSec);
    if (staleRunning.length) parts.push(`${COLOR.r}Stale (> ${staleThresholdSec}s):${COLOR.reset} ` + staleRunning.map(t => t.taskId).join(', '));
    return `[delegate:loop] ${summary}\n` + parts.join('\n');
}

function hashPlan(plan: unknown): string {
    try { return crypto.createHash('sha1').update(JSON.stringify(plan)).digest('hex'); } catch { return ''; }
}

function loadPlan(): any | null {
    const p = path.resolve('.codex/last-plan.json');
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function readQueueLines(): string[] {
    if (!fs.existsSync(QUEUE)) return [];
    return fs.readFileSync(QUEUE, 'utf8').split(/\r?\n/).filter(Boolean);
}

function parseTasks() {
    const lines = readQueueLines();
    const tasks = [] as any[];
    for (const line of lines.slice(1)) { // skip header
        try { tasks.push(JSON.parse(line)); } catch { /* ignore */ }
    }
    return tasks;
}

function hashTasks(tasks: any[]): string {
    return tasks.map(t => `${t.taskId}:${t.status}:${t.updatedAt}`).join('|');
}

function pickPending(tasks: any[]) {
    return tasks.find(t => t.status === 'pending');
}

function hasRunning(tasks: any[]) {
    return tasks.some(t => t.status === 'running');
}

function markRunning(taskId: string) {
    const lines = readQueueLines();
    const out: string[] = [];
    if (!lines.length) return;
    out.push(lines[0]);
    const now = new Date().toISOString();
    for (const line of lines.slice(1)) {
        try {
            const obj = JSON.parse(line);
            if (obj.taskId === taskId && obj.status === 'pending') {
                obj.status = 'running';
                obj.updatedAt = now;
                out.push(JSON.stringify(obj));
            } else out.push(line);
        } catch { out.push(line); }
    }
    fs.writeFileSync(QUEUE, out.join('\n') + '\n');
}

function markStatus(taskId: string, from: string, to: string) {
    const lines = readQueueLines();
    if (!lines.length) return;
    const out: string[] = [lines[0]];
    const now = new Date().toISOString();
    for (const line of lines.slice(1)) {
        try {
            const obj = JSON.parse(line);
            if (obj.taskId === taskId && obj.status === from) {
                obj.status = to;
                obj.updatedAt = now;
                out.push(JSON.stringify(obj));
            } else out.push(line);
        } catch { out.push(line); }
    }
    fs.writeFileSync(QUEUE, out.join('\n') + '\n');
}

function processQueue() {
    if (running) return;
    const tasks = parseTasks();
    const hash = hashTasks(tasks);
    if (hash !== lastHash) {
        lastHash = hash;
        try {
            const pretty = renderSnapshot(tasks as any[]);
            // eslint-disable-next-line no-console
            console.log(pretty);
        } catch {
            // fallback minimal
            // eslint-disable-next-line no-console
            console.log('[delegate:loop] queue snapshot', tasks.map(t => `${t.taskId}:${t.status}`).join(', '));
        }
    }
    // Auto-fail stale running tasks so queue can make progress
    const STALE_SEC = Number(process.env.DELEGATE_STALE_SEC || 900); // 15m default
    let progressed = false;
    for (const t of tasks) {
        if (t.status === 'running') {
            const age = ageSec(t.updatedAt);
            if (age > STALE_SEC) {
                markStatus(t.taskId, 'running', 'failed');
                progressed = true;
                // eslint-disable-next-line no-console
                console.log(`${COLOR.r}[delegate:loop] auto-failed stale task${COLOR.reset} ${t.taskId} age=${Math.round(age)}s>`);
            }
        }
    }
    if (progressed) return; // will re-evaluate next tick
    if (hasRunning(tasks)) return; // wait for completion

    // (1) Emit / refresh synthesized plan file for hashing & delta detection
    if (process.env.PLAN_HASH_DELTA === '1') {
        try {
            const synthesizedPlan = {
                generatedAt: new Date().toISOString(),
                tasks: tasks.map(t => ({ id: t.taskId, status: t.status, files: (t.files || []).length, estLoc: t.estLoc }))
            };
            const planPath = path.resolve('.codex/last-plan.json');
            fs.mkdirSync(path.dirname(planPath), { recursive: true });
            fs.writeFileSync(planPath, JSON.stringify(synthesizedPlan, null, 2));
            const ph = hashPlan(synthesizedPlan);
            if (ph && ph !== lastPlanHash) {
                lastPlanHash = ph;
                // eslint-disable-next-line no-console
                console.log('[delegate:loop] plan hash delta', ph.slice(0, 8));
            }
        } catch { /* silent */ }
    }
    const pending = pickPending(tasks);
    if (!pending) return; // nothing to do
    markRunning(pending.taskId);

    // (2) Decide adaptive profile via profile-router (if present)
    let activeProfile = process.env.DEFAULT_PROFILE || 'balanced';
    try {
        const routerPath = path.resolve('.codex/scripts/profile-router.ts');
        if (fs.existsSync(routerPath)) {
            const taskMeta = { id: pending.taskId, summary: pending.summary, files: pending.files, estLoc: pending.estLoc, previousFailures: pending.previousFailures, domains: pending.domains };
            const pr = spawnSync('ts-node', [routerPath], { input: JSON.stringify(taskMeta), encoding: 'utf8' });
            if (pr.status === 0 && pr.stdout) {
                const decision = JSON.parse(pr.stdout.split(/\n/).filter(Boolean).pop() || '{}');
                if (decision.profile) activeProfile = decision.profile;
                // eslint-disable-next-line no-console
                console.log(`[delegate:loop] profile-router → ${activeProfile} (${decision.reason || 'no-reason'})`);
            }
        }
    } catch (e) {
        console.warn('[delegate:loop] profile router failed', (e as any)?.message);
    }

    running = true;
    const started = Date.now();
    const proc = spawn('npm', ['run', 'delegate:process'], { stdio: 'inherit', env: { ...process.env, AIDER_AUTORUN: '1', ACTIVE_PROFILE: activeProfile } });
    proc.on('exit', (code) => {
        const durMs = Date.now() - started;
        // eslint-disable-next-line no-console
        console.log(`[delegate:loop] delegate:process exited code=${code} duration=${durMs}ms`);
        if (process.env.TOKEN_LEDGER === '1') {
            try {
                const metricsPath = path.resolve('.codex/tmp/last-token-stats.json');
                let tokenStats: any = null;
                if (fs.existsSync(metricsPath)) {
                    try { tokenStats = JSON.parse(fs.readFileSync(metricsPath, 'utf8')); } catch { tokenStats = null; }
                }
                const ledgerLine = {
                    ts: Date.now(),
                    taskId: pending.taskId,
                    profile: activeProfile,
                    input_tokens: tokenStats?.input_tokens ?? tokenStats?.input_tokens_est ?? 0,
                    output_tokens: tokenStats?.output_tokens ?? tokenStats?.output_tokens_est ?? 0,
                    tool_calls: tokenStats?.tool_calls ?? 0,
                    success: code === 0
                };
                fs.appendFileSync('.codex/token-ledger.jsonl', JSON.stringify(ledgerLine) + '\n');
            } catch (e) { /* ignore */ }
        }
        running = false;
    });
}

setInterval(processQueue, INTERVAL_BASE);
processQueue();
