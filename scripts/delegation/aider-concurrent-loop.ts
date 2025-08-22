#!/usr/bin/env ts-node
/* Aider concurrent execution loop (parallel aider instances up to 4)
   - Respects AIDER_MAX_PARALLEL (1..4)
   - Skips tasks tagged for Codex (summary starting with [CODEX])
   - Simple file locking to avoid overlapping edits
*/
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
// Queue metrics (best-effort, ignore if module missing)
let queueMetrics: undefined | { recordQueueStart: (c?: number) => void; recordQueueDone: (success: boolean, c?: number) => void } = (() => { try { return require('../../src/lib/metrics/queue-metrics'); } catch { return undefined; } })();

interface QueueTask { taskId: string; summary: string; files?: string[]; status: string; updatedAt?: string; createdAt?: string; notes?: string }

const QUEUE_FILE = path.resolve('sessions/aider-queue.jsonl');
const LEDGER = path.resolve('.codex/aider-parallel-ledger.jsonl');
const PARALLEL = Math.min(4, Math.max(1, parseInt(process.env.AIDER_MAX_PARALLEL || '2', 10)));
const INTERVAL_MS = parseInt(process.env.AIDER_LOOP_INTERVAL || '12000', 10);
const MODEL_CANDIDATES = (process.env.AIDER_MODEL_CANDIDATES || 'gpt-5-mini,gpt-4.1-mini,gpt-4o-mini').split(',').map(s => s.trim()).filter(Boolean);
const MODEL = process.env.AIDER_MODEL || MODEL_CANDIDATES[0] || 'gpt-4.1-mini';
const locks = new Map<string, number>();
const active = new Map<string, { proc: unknown; files: string[]; started: number }>();
let lastSnapshotHash = '';
const STALE_MS = parseInt(process.env.AIDER_STALE_MS || '300000', 10); // 5m

function readQueue(): QueueTask[] {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const lines = fs.readFileSync(QUEUE_FILE, 'utf8').trim().split(/\n/);
    const tasks: QueueTask[] = [];
    for (const line of lines.slice(1)) { if (line.trim()) { try { tasks.push(JSON.parse(line)); } catch { /* ignore */ } } }
    return tasks;
}
function hashTasks(tasks: QueueTask[]) { return tasks.map(t => `${t.taskId}:${t.status}:${t.updatedAt}`).join('|'); }
function writeQueue(tasks: QueueTask[]) {
    if (!fs.existsSync(QUEUE_FILE)) return;
    const raw = fs.readFileSync(QUEUE_FILE, 'utf8').split(/\n/);
    const header = raw[0] || JSON.stringify({ meta: 'delegation queue' });
    const byId = new Map(tasks.map(t => [t.taskId, t]));
    const out: string[] = [header];
    for (const line of raw.slice(1)) {
        if (!line.trim()) continue;
        try { const obj = JSON.parse(line); if (byId.has(obj.taskId)) out.push(JSON.stringify(byId.get(obj.taskId))); else out.push(line); } catch { out.push(line); }
    }
    fs.writeFileSync(QUEUE_FILE, out.join('\n') + '\n');
}
function acquireFiles(files: string[]): boolean { for (const f of files) { if (locks.get(f)) return false; } files.forEach(f => locks.set(f, 1)); return true; }
function releaseFiles(files: string[]) { files.forEach(f => locks.delete(f)); }
function markRunning(task: QueueTask) { const tasks = readQueue(); const now = new Date().toISOString(); for (const t of tasks) { if (t.taskId === task.taskId && t.status === 'pending') { t.status = 'running'; t.updatedAt = now; } } writeQueue(tasks); }
function markDone(taskId: string, success: boolean) { const tasks = readQueue(); const now = new Date().toISOString(); for (const t of tasks) { if (t.taskId === taskId && t.status === 'running') { t.status = success ? 'done' : 'failed'; t.updatedAt = now; } } writeQueue(tasks); try { queueMetrics?.recordQueueDone(success, 1); } catch { } }
function ledger(taskId: string, durationMs: number, success: boolean) { const line = { ts: Date.now(), taskId, durationMs, success, model: MODEL, parallelRemaining: active.size }; fs.appendFileSync(LEDGER, JSON.stringify(line) + '\n'); }
function buildMessage(t: QueueTask): string { const base = t.summary || ''; const lintRuleMatch = base.match(/Resolve (.*?) /); const rule = lintRuleMatch ? lintRuleMatch[1] : ''; return `Resolve ONLY the targeted issue described. Rule: ${rule}. Keep changes minimal & safe. Summary: ${base}`; }
function launch(task: QueueTask) {
    const files = task.files || [];
    if (files.length && !acquireFiles(files)) return false;
    markRunning(task);
    try { queueMetrics?.recordQueueStart(1); } catch { }
    const started = Date.now();
    const aiderArgs = ['--model', MODEL, ...((process.env.AIDER_ARGS || '').split(/\s+/).filter(Boolean)), ...files, '--yes', '--message', buildMessage(task)];
    if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_GPT5_KEY) { console.log(`[aider:loop] skip ${task.taskId} missing OPENAI key`); markDone(task.taskId, false); if (files.length) releaseFiles(files); return false; }
    const proc = spawn('aider', aiderArgs, { stdio: 'inherit', env: { ...process.env, AIDER_AUTORUN: '1', AIDER_PARALLEL: '1' } });
    active.set(task.taskId, { proc, files, started });
    (proc as { on: (evt: string, cb: (code: number | null) => void) => void }).on('exit', code => {
        const dur = Date.now() - started;
        if (files.length) releaseFiles(files);
        active.delete(task.taskId);
        markDone(task.taskId, code === 0);
        ledger(task.taskId, dur, code === 0);
    });
    return true;
}
function cycle() {
    const tasks = readQueue();
    const now = Date.now();
    let recycled = false;
    for (const t of tasks) { if (t.status === 'running' && !active.has(t.taskId) && t.updatedAt) { const age = now - Date.parse(t.updatedAt); if (age > STALE_MS) { t.status = 'pending'; t.updatedAt = new Date().toISOString(); recycled = true; } } }
    if (recycled) writeQueue(tasks);
    const hash = hashTasks(tasks); if (hash !== lastSnapshotHash) { lastSnapshotHash = hash; const inst = process.env.AIDER_INSTANCE ? `#${process.env.AIDER_INSTANCE}` : ''; console.log(`[aider:loop${inst}] snapshot`, tasks.map(t => `${t.taskId}:${t.status}`).join(', ')); }
    if (active.size >= PARALLEL) return;
    for (const t of tasks) { if (active.size >= PARALLEL) break; if (t.status !== 'pending') continue; if (/^\[CODEX]/.test(t.summary || '')) continue; const files = t.files || []; if (!files.length || files.every(f => !locks.get(f))) launch(t); }
}
setInterval(cycle, INTERVAL_MS); cycle(); process.on('SIGINT', () => { console.log('\n[aider:loop] shutdown'); process.exit(0); });
