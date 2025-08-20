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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qu = require('./queue-utils.ts') || (globalThis as any).__QUEUE_UTILS__;
import type * as Q from './queue-utils';
const hoseTasks = qu.hoseTasks as Q['hoseTasks'];
const purgeTasks = qu.purgeTasks as Q['purgeTasks'];
const readQueue = qu.readQueue as Q['readQueue'];

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
const predicate = (t: any) => {
    if (all) return true;
    if (match && !(t.taskId.includes(match) || (t.summary || '').includes(match))) return false;
    if (status && t.status !== status) return false;
    if (olderMinutes && (now - new Date(t.updatedAt).getTime()) < olderMinutes * 60_000) return false;
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
