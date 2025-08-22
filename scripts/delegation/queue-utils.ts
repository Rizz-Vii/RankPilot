import fs from 'fs';
import path from 'path';
// Lazy metrics import (non-fatal if metrics file absent)
let queueMetrics: undefined | { recordQueueEnqueue: (c?: number) => void } = (() => {
    try {
        return require('../../src/lib/metrics/queue-metrics');
    } catch {
        return undefined;
    }
})();

export interface DelegationQueueTask {
    taskId: string;
    summary: string;
    files: string[];
    status: 'pending' | 'running' | 'done' | 'failed';
    createdAt: string; // ISO
    updatedAt: string; // ISO
    aideModel?: string;
    notes?: string;
}

export const QUEUE_FILE = path.resolve(process.cwd(), 'sessions/aider-queue.jsonl');

export function ensureQueueFile() {
    if (!fs.existsSync(path.dirname(QUEUE_FILE))) {
        fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
    }
    if (!fs.existsSync(QUEUE_FILE)) {
        fs.writeFileSync(
            QUEUE_FILE,
            JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' }) + '\n',
            'utf8'
        );
    }
}

export function readQueue(): DelegationQueueTask[] {
    ensureQueueFile();
    const lines = fs.readFileSync(QUEUE_FILE, 'utf8').trim().split(/\n/).filter(l => l.trim() && !l.includes('"meta"'));
    return lines.map(l => {
        try {
            return JSON.parse(l) as DelegationQueueTask;
        } catch {
            return null as unknown as DelegationQueueTask;
        }
    }).filter(Boolean);
}

export function appendTask(task: DelegationQueueTask) {
    ensureQueueFile();
    fs.appendFileSync(QUEUE_FILE, JSON.stringify(task) + '\n');
    try { queueMetrics?.recordQueueEnqueue(1); } catch { /* ignore metrics errors */ }
}

export function writeQueue(tasks: DelegationQueueTask[]) {
    ensureQueueFile();
    const header = JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' });
    const body = tasks.map(t => JSON.stringify(t)).join('\n');
    fs.writeFileSync(QUEUE_FILE, header + '\n' + body + (body ? '\n' : ''), 'utf8');
}

/** Remove tasks matching a predicate. Returns number removed. */
export function purgeTasks(predicate: (t: DelegationQueueTask) => boolean): number {
    const tasks = readQueue();
    const kept: DelegationQueueTask[] = [];
    let removed = 0;
    for (const t of tasks) {
        if (predicate(t)) removed++; else kept.push(t);
    }
    if (removed) writeQueue(kept);
    return removed;
}

/** Mark tasks matching predicate as done (hose without deleting). Returns number updated. */
export function hoseTasks(predicate: (t: DelegationQueueTask) => boolean): number {
    const tasks = readQueue();
    let updated = 0;
    for (const t of tasks) {
        if (predicate(t)) {
            if (t.status === 'pending' || t.status === 'failed') {
                t.status = 'done';
                t.updatedAt = new Date().toISOString();
                // Add note so later analytics can differentiate synthetic closure
                t.notes = (t.notes ? t.notes + ';' : '') + 'hose_close';
                updated++;
            }
        }
    }
    if (updated) writeQueue(tasks);
    return updated;
}

// Provide CommonJS interop for mixed environments (ts-node, NodeNext).
const g = globalThis as unknown as Record<string, unknown>;
// @ts-ignore
if (typeof module !== 'undefined' && module && module.exports) {
    // Avoid overwriting if already set
    // @ts-ignore
    if (!module.exports || !module.exports.readQueue) {
        // @ts-ignore
        module.exports = { ensureQueueFile, readQueue, appendTask, writeQueue, purgeTasks, hoseTasks, QUEUE_FILE };
    }
}
// Attach to global (non-enumerable) for edge loaders that drop named exports
try {
    Object.defineProperty(g as object, '__QUEUE_UTILS__', {
        value: { ensureQueueFile, readQueue, appendTask, writeQueue, purgeTasks, hoseTasks, QUEUE_FILE },
        configurable: false,
        enumerable: false,
        writable: false
    });
} catch {
    /* ignore */
}
