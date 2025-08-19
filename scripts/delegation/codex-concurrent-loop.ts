/* Codex concurrent execution loop
   Purpose: Similar to aider delegation loop but allows limited parallel codex-driven executions.
   Concurrency safeguards:
     - Max PARALLEL (env CODEX_MAX_PARALLEL, default 2)
     - Avoid editing same file in two active tasks (simple file lock map)
*/
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
// Lazy import of memory recorder to avoid hard failure if brain build not present
let recordMemory: undefined | ((ev: any) => void);
try { recordMemory = require('../brain/state/memory').recordMemory; } catch { /* memory layer optional */ }

interface QueueTask { taskId: string; summary: string; files?: string[]; status: string; updatedAt?: string; createdAt?: string }

const QUEUE_FILE = path.resolve('sessions/aider-queue.jsonl');
const LEDGER = path.resolve('.codex/codex-ledger.jsonl');
const PARALLEL = parseInt(process.env.CODEX_MAX_PARALLEL || '2', 10);
const INTERVAL_MS = parseInt(process.env.CODEX_LOOP_INTERVAL || '12000', 10);
const locks = new Map<string, number>(); // file -> active count
const active = new Map<string, { proc: any; files: string[]; started: number }>();
let lastSnapshotHash = '';
const STALE_MS = parseInt(process.env.CODEX_STALE_MS || '300000', 10); // 5m default

function readQueue(): QueueTask[] {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const lines = fs.readFileSync(QUEUE_FILE, 'utf8').trim().split(/\n/);
    const tasks: QueueTask[] = [];
    for (const line of lines.slice(1)) { // skip header
        try { tasks.push(JSON.parse(line)); } catch { /* ignore */ }
    }
    return tasks;
}

function hashTasks(tasks: QueueTask[]) { return tasks.map(t => `${t.taskId}:${t.status}:${t.updatedAt}`).join('|'); }

function writeQueue(tasks: QueueTask[]) {
    if (!fs.existsSync(QUEUE_FILE)) return; // keep format stable (header preserved)
    const raw = fs.readFileSync(QUEUE_FILE, 'utf8').split(/\n/);
    const header = raw[0] || JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' });
    const byId = new Map(tasks.map(t => [t.taskId, t]));
    const out: string[] = [header];
    for (const line of raw.slice(1)) {
        if (!line.trim()) continue;
        try { const obj = JSON.parse(line); if (byId.has(obj.taskId)) out.push(JSON.stringify(byId.get(obj.taskId))); else out.push(line); } catch { out.push(line); }
    }
    fs.writeFileSync(QUEUE_FILE, out.join('\n') + '\n');
}

function acquireFiles(files: string[]): boolean {
    for (const f of files) { if (locks.get(f)) return false; }
    for (const f of files) { locks.set(f, 1); }
    return true;
}
function releaseFiles(files: string[]) { for (const f of files) locks.delete(f); }

function markRunning(task: QueueTask) {
    const tasks = readQueue();
    const now = new Date().toISOString();
    for (const t of tasks) {
        if (t.taskId === task.taskId && t.status === 'pending') { t.status = 'running'; t.updatedAt = now; }
    }
    writeQueue(tasks);
}

function markDone(taskId: string, success: boolean) {
    const tasks = readQueue();
    const now = new Date().toISOString();
    for (const t of tasks) {
        if (t.taskId === taskId && t.status === 'running') { t.status = success ? 'done' : 'failed'; t.updatedAt = now; }
    }
    writeQueue(tasks);
}

function ledger(taskId: string, durationMs: number, success: boolean, meta: any = {}) {
    const line = { ts: Date.now(), taskId, durationMs, success, ...meta };
    fs.appendFileSync(LEDGER, JSON.stringify(line) + '\n');
    try { recordMemory && recordMemory({ ts: Date.now(), source: 'codex', kind: 'task-complete', id: taskId, status: success ? 'ok' : 'fail', meta: { durationMs } }); } catch { }
}

function launch(task: QueueTask) {
    const files = task.files || [];
    if (files.length && !acquireFiles(files)) return false;
    markRunning(task);
    const started = Date.now();
    const cmd = process.env.CODEX_EXEC_CMD || 'npm run delegate:process';
    const parts = cmd.split(/\s+/);
    const proc = spawn(parts.shift()!, parts, { stdio: 'inherit', env: { ...process.env, CODEX_MODE: '1', TARGET_TASK: task.taskId } });
    active.set(task.taskId, { proc, files, started });
    proc.on('exit', (code) => {
        const dur = Date.now() - started;
        if (files.length) releaseFiles(files);
        active.delete(task.taskId);
        markDone(task.taskId, code === 0);
        ledger(task.taskId, dur, code === 0, { parallelRemaining: active.size });
    });
    return true;
}

function cycle() {
    const tasks = readQueue();
    // Recycle stale running tasks with no active process
    const now = Date.now();
    let recycled = false;
    for (const t of tasks) {
        if (t.status === 'running' && !active.has(t.taskId) && t.updatedAt) {
            const age = now - Date.parse(t.updatedAt);
            if (age > STALE_MS) { t.status = 'pending'; t.updatedAt = new Date().toISOString(); recycled = true; try { recordMemory && recordMemory({ ts: Date.now(), source: 'codex', kind: 'task-recycled', id: t.taskId, status: 'pending', meta: { ageMs: age } }); } catch { } }
        }
    }
    if (recycled) writeQueue(tasks);
    const hash = hashTasks(tasks);
    if (hash !== lastSnapshotHash) {
        lastSnapshotHash = hash;
        const inst = process.env.CODEX_INSTANCE ? `#${process.env.CODEX_INSTANCE}` : '';
        console.log(`[codex:loop${inst}] snapshot`, tasks.map(t => `${t.taskId}:${t.status}`).join(', '));
    }
    if (active.size >= PARALLEL) return;
    for (const t of tasks) {
        if (active.size >= PARALLEL) break;
        if (t.status !== 'pending') continue;
        const files = t.files || [];
        if (!files.length || files.every(f => !locks.get(f))) launch(t);
    }
}

setInterval(cycle, INTERVAL_MS);
cycle();

process.on('SIGINT', () => { console.log('\n[codex:loop] shutdown'); process.exit(0); });
