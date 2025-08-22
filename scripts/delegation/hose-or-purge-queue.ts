#!/usr/bin/env ts-node
/**
 * Hose / purge delegation queue utility.
 *
 * Examples:
 *  ts-node scripts/delegation/hose-or-purge-queue.ts --hose --match AI-LINT-
 *  ts-node scripts/delegation/hose-or-purge-queue.ts --purge --status failed
 *  ts-node scripts/delegation/hose-or-purge-queue.ts --purge --all
 *
 * Flags:
 *  --hose           Mark matching tasks as done (adds notes hose_close)
 *  --purge          Remove matching tasks entirely
 *  --all            Match all tasks (overrides other match filters)
 *  --match <substr> Substring match on taskId OR summary
 *  --status <s>     Filter by status (pending|running|done|failed)
 *  --olderMinutes N Only match tasks with updatedAt older than N minutes
 *  --dry            Dry run (show counts, no mutation)
 */
// Use require to ensure CommonJS interop in ts-node NodeNext mode (matches other delegation scripts)

const qu = require('./queue-utils.ts') || (globalThis as unknown as { __QUEUE_UTILS__?: unknown }).__QUEUE_UTILS__;
type QueueModuleShape = {
    hoseTasks: (predicate: (t: { taskId: string; summary: string; status: string; updatedAt: string }) => boolean) => number;
    purgeTasks: (predicate: (t: { taskId: string; summary: string; status: string; updatedAt: string }) => boolean) => number;
    readQueue: () => Array<{ taskId: string; summary: string; status: string; updatedAt: string }>;
};
const hoseTasks = (qu as unknown as QueueModuleShape).hoseTasks;
const purgeTasks = (qu as unknown as QueueModuleShape).purgeTasks;
const readQueue = (qu as unknown as QueueModuleShape).readQueue;

interface Args { [k: string]: string | boolean | undefined; }
function parseArgs(): Args {
    const out: Args = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = argv[i + 1];
            if (next && !next.startsWith('--')) { out[key] = next; i++; }
            else out[key] = true;
        }
    }
    return out;
}

const args = parseArgs();
const doHose = !!args.hose;
const doPurge = !!args.purge;
if (!doHose && !doPurge) {
    console.error('Specify --hose or --purge');
    process.exit(1);
}
const all = !!args.all;
const match = typeof args.match === 'string' ? args.match : undefined;
const status = typeof args.status === 'string' ? args.status : undefined;
const olderMinutes = args.olderMinutes ? Number(args.olderMinutes) : undefined;
const dry = !!args.dry;

const now = Date.now();
const queue = readQueue();
type TaskLike = { taskId?: string; summary?: string; status?: string; updatedAt?: string };
const predicate = (t: TaskLike) => {
    if (all) return true;
    const taskId = typeof t.taskId === 'string' ? t.taskId : '';
    const summary = typeof t.summary === 'string' ? t.summary : '';
    if (match && !(taskId.includes(match) || summary.includes(match))) return false;
    if (status && t.status !== status) return false;
    if (olderMinutes && t.updatedAt && (now - new Date(t.updatedAt).getTime()) < olderMinutes * 60_000) return false;
    return true;
};

const matches = queue.filter(predicate);
console.log(`Matched ${matches.length} tasks (total ${queue.length}). Mode=${doHose ? 'HOSE' : 'PURGE'}${dry ? ' DRY' : ''}`);
if (dry) process.exit(0);

if (doHose) {
    const updated = hoseTasks(predicate);
    console.log(`Hosed ${updated} tasks.`);
} else if (doPurge) {
    const removed = purgeTasks(predicate);
    console.log(`Purged ${removed} tasks.`);
}
