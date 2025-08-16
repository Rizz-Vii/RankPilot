#!/usr/bin/env ts-node
import { readQueue, writeQueue, createLock, isLocked, getLock, releaseLock, cleanupLock } from './queue-utils';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Lightweight env loader (avoids external dotenv dep). Loads .env.local then .env if present BEFORE key checks.
(() => {
    const candidateFiles = ['.env.local', '.env'];
    for (const file of candidateFiles) {
        try {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf8');
            for (const lineRaw of content.split(/\n/)) {
                const line = lineRaw.trim();
                if (!line || line.startsWith('#')) continue;
                const eq = line.indexOf('=');
                if (eq === -1) continue;
                const key = line.slice(0, eq).trim();
                // Preserve existing env vars (never overwrite runtime / exported values)
                if (process.env[key] !== undefined) continue;
                let val = line.slice(eq + 1).trim();
                // Strip surrounding quotes if present
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                // Unescape common \n sequences for private keys
                if (val.includes('\\n')) val = val.replace(/\\n/g, '\n');
                process.env[key] = val;
            }
            // Only process first existing file in priority order
        } catch (e) {
            // Silent: env loading is best-effort
        }
    }
})();

// Environment & runtime flags
const AIDER_AUTORUN = process.env.AIDER_AUTORUN === '1';
// Prefer modern OpenAI model names; allow candidate override via AIDER_MODEL_CANDIDATES
const MODEL_CANDIDATES = (process.env.AIDER_MODEL_CANDIDATES || 'gpt-5-mini,gpt-4.1-mini,gpt-4.1,gpt-4o-mini,gpt-4o').split(',').map(s => s.trim()).filter(Boolean);
const MODEL = process.env.AIDER_MODEL || MODEL_CANDIDATES[0] || 'gpt-4.1-mini';
const DRY_RUN = process.env.DRY_RUN === '1';
const RUN_TESTS = process.env.DELEGATION_RUN_TESTS === '1'; // optional post-success quality gate
const TEST_SCRIPT = process.env.DELEGATION_TEST_SCRIPT || 'test:delegation-smoke';
// Permit passing additional non-interactive aider CLI flags (space separated) via AIDER_ARGS
const AIDER_ARGS = (process.env.AIDER_ARGS || '').trim().split(/\s+/).filter(Boolean);
// Convenience: if OPENAI_API_KEY absent but OPENAI_GPT5_KEY present, map it (local only; never persisted)
if (!process.env.OPENAI_API_KEY && process.env.OPENAI_GPT5_KEY) {
    process.env.OPENAI_API_KEY = process.env.OPENAI_GPT5_KEY;
}

// Validation thresholds / policies
const MAX_FILE_BYTES = 80 * 1024; // single file guard (~80KB)
const MAX_AGG_BYTES = 40 * 1024;  // aggregate soft cap (~40KB)
const LOG_ROTATE_BYTES = 200 * 1024; // rotate aide log after 200KB
const EXT_ALLOW = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.css']);

// Extend task type at runtime with optional message support (not persisted in strict schema yet)
type DelegationTask = ReturnType<typeof readQueue>[number] & { message?: string };
let tasks = readQueue() as DelegationTask[];
let changed = false;

const LOG_FILE = path.resolve('sessions/aider-log.jsonl');
function appendLog(entry: any) {
    try {
        if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        if (!fs.existsSync(LOG_FILE)) {
            fs.writeFileSync(LOG_FILE, JSON.stringify({ meta: 'aider delegation log (JSON Lines). Append one object per completed delegated task; rotate when file >200KB.' }) + '\n');
        }
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
        // Rotate if oversized
        try {
            const stat = fs.statSync(LOG_FILE);
            if (stat.size > LOG_ROTATE_BYTES) {
                const rotated = LOG_FILE.replace(/\.jsonl$/, '') + `.${Date.now()}.jsonl`;
                fs.renameSync(LOG_FILE, rotated);
                fs.writeFileSync(LOG_FILE, JSON.stringify({ meta: 'aider delegation log (rotated)' }) + '\n');
            }
        } catch { /* noop */ }
    } catch (e) {
        console.error('[delegation] failed to append log', (e as any)?.message);
    }
}

function computeLocDelta(files: string[]): { added: number; removed: number } {
    try {
        // Use git diff --numstat to aggregate changes for the provided files (against HEAD)
        const cmd = `git diff --numstat ${files.map(f => `'${f}'`).join(' ')}`;
        const out = execSync(cmd, { encoding: 'utf8' }).trim();
        if (!out) return { added: 0, removed: 0 };
        let added = 0, removed = 0;
        out.split(/\n/).forEach(line => {
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                const a = parseInt(parts[0], 10);
                const r = parseInt(parts[1], 10);
                if (!isNaN(a)) added += a;
                if (!isNaN(r)) removed += r;
            }
        });
        return { added, removed };
    } catch {
        return { added: 0, removed: 0 };
    }
}

function validateFiles(files: string[]) {
    const details: { file: string; size: number; ok: boolean; reason?: string }[] = [];
    let agg = 0;
    let anyLarge = false;
    for (const f of files) {
        if (!fs.existsSync(f)) {
            details.push({ file: f, size: 0, ok: false, reason: 'missing' });
            continue;
        }
        const stat = fs.statSync(f);
        const ext = path.extname(f).toLowerCase();
        const allowed = EXT_ALLOW.has(ext);
        const tooLarge = stat.size > MAX_FILE_BYTES;
        if (tooLarge) anyLarge = true;
        agg += stat.size;
        details.push({ file: f, size: stat.size, ok: allowed && !tooLarge, reason: !allowed ? 'ext_disallowed' : tooLarge ? 'file_too_large' : undefined });
    }
    const aggregateTooLarge = agg > MAX_AGG_BYTES;
    let risk: string = 'ok';
    if (aggregateTooLarge) risk = 'aggregate_too_large';
    else if (anyLarge) risk = 'large_file';
    else if (details.some(d => !d.ok)) risk = 'file_issue';
    return { details, aggregateBytes: agg, aggregateTooLarge, risk };
}

function isDirectDeleteTask(task: any): boolean {
    const directIds = new Set([
        'DEL-REMOVE-ENHANCED-CARD-STUB',
        'DEL-REMOVE-MOBILE-NAV-TEST',
        'DEL-REMOVE-DASHBOARD-BACKUP',
        'DEL-CONTENT-ANALYZER-FIXED-NOTE'
    ]);
    if (directIds.has(task.taskId)) return true;
    const s = (task.summary || '').toLowerCase();
    return /delete unused|remove deprecated|delete obsolete|remove content-analyzer page-fixed/.test(s);
}

// Check for existing lock before processing
const existingLock = getLock();
if (existingLock) {
    console.error(`[lockfile] Another delegation process is already running:`);
    console.error(`  PID: ${existingLock.pid}`);
    console.error(`  Hostname: ${existingLock.hostname}`);
    console.error(`  Task: ${existingLock.taskId}`);
    console.error(`  Started: ${existingLock.timestamp}`);
    console.error(`  Expires: ${existingLock.expiresAt}`);
    console.error(`[lockfile] Wait for it to complete or remove the lock file manually: sessions/aider-delegation.lock`);
    process.exit(1);
}

for (const task of tasks) {
    if (task.status !== 'pending') continue;
    
    // Create lock for this task processing
    if (!createLock(task.taskId)) {
        console.error(`[lockfile] Failed to create lock for task ${task.taskId}`);
        continue;
    }
    
    // Ensure lock is released on exit
    const releaseLockOnExit = () => {
        releaseLock();
        process.exit();
    };
    process.on('SIGINT', releaseLockOnExit);
    process.on('SIGTERM', releaseLockOnExit);
    process.on('exit', () => releaseLock());
    
    task.status = 'running';
    task.updatedAt = new Date().toISOString();
    changed = true;
    writeQueue(tasks);
    console.log(`Processing ${task.taskId} (${task.files.length} files) mode=${AIDER_AUTORUN ? 'autorun' : 'manual'}`);
    const validation = validateFiles(task.files);
    if (validation.risk !== 'ok') {
        // Mark failed early (except manual mode retains pending for user review)
        if (DRY_RUN) {
            console.log(`[dry-run] Validation risk=${validation.risk}; task left pending.`);
        } else {
            task.status = 'failed';
            // @ts-ignore
            task.notes = `validation_failed:${validation.risk}`;
            appendLog({ taskId: task.taskId, filesChanged: task.files.length, status: 'failed', ts: new Date().toISOString(), notes: task.notes, validation });
            task.updatedAt = new Date().toISOString();
            changed = true;
            continue;
        }
    }

    if (DRY_RUN) {
        console.log(`[dry-run] aider command: aider --model ${MODEL} ${task.files.join(' ')}`);
        console.table(validation.details);
        console.log(`[dry-run] aggregateBytes=${validation.aggregateBytes} risk=${validation.risk}`);
        task.status = 'pending';
        task.updatedAt = new Date().toISOString();
        continue;
    }

    // Direct deletion path (bypass aider for trivial single-file removals)
    if (isDirectDeleteTask(task)) {
        console.log(`[direct-delete] ${task.taskId}: deleting files without aider.`);
        for (const f of task.files) {
            try {
                if (fs.existsSync(f)) fs.unlinkSync(f);
            } catch (e) {
                console.warn(`[direct-delete] failed to delete ${f}: ${(e as any)?.message}`);
            }
        }
        task.status = 'done';
        const { added, removed } = computeLocDelta(task.files);
        
        // Calculate risk metadata for direct delete operations
        const totalLoc = added + removed;
        let locRisk = 'low';
        if (totalLoc > 200) locRisk = 'high';
        else if (totalLoc > 100) locRisk = 'medium';
        
        appendLog({ 
            taskId: task.taskId, 
            filesChanged: task.files.length, 
            locAdded: added, 
            locRemoved: removed, 
            status: 'pass', 
            ts: new Date().toISOString(), 
            notes: 'direct_delete',
            risk: {
                locDelta: locRisk,
                totalLoc: totalLoc,
                fileCount: task.files.length
            }
        });
        task.updatedAt = new Date().toISOString();
        changed = true;
        continue;
    }

    if (!AIDER_AUTORUN) {
        console.log('Manual mode: run the following command locally (after installing aider):');
        console.log(`  aider --model ${MODEL} ${task.files.join(' ')}`);
        task.status = 'pending';
        task.updatedAt = new Date().toISOString();
        continue;
    }
    try {
        const aiderArgs = ['--model', MODEL, ...AIDER_ARGS, ...task.files, '--yes'];
        const fallbackMessage = 'Apply requested mechanical edits described by task summary: ' + task.summary + ' (idempotent). If already applied, make no changes.';
        const effectiveMessage = (task as any).message && typeof (task as any).message === 'string' && (task as any).message.trim().length ? (task as any).message.trim() : fallbackMessage;
        aiderArgs.push('--message', effectiveMessage);
        // If API key missing, skip aider invocation gracefully
        if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_GPT5_KEY) {
            console.log(`[skip] ${task.taskId}: OPENAI_API_KEY missing; leaving task pending.`);
            task.status = 'pending';
            // @ts-ignore
            task.notes = 'awaiting_api_key';
            appendLog({ taskId: task.taskId, filesChanged: task.files.length, status: 'skipped', ts: new Date().toISOString(), notes: 'awaiting_api_key' });
            task.updatedAt = new Date().toISOString();
            changed = true;
            continue;
        }
        const res = spawnSync('aider', aiderArgs, { stdio: 'inherit' });
        if (res.status === 0) {
            task.status = 'done';
            const { added, removed } = computeLocDelta(task.files);
            
            // Calculate risk metadata based on LOC delta
            const totalLoc = added + removed;
            let locRisk = 'low';
            if (totalLoc > 200) locRisk = 'high';
            else if (totalLoc > 100) locRisk = 'medium';
            
            const baseEntry: any = { 
                taskId: task.taskId, 
                filesChanged: task.files.length, 
                locAdded: added, 
                locRemoved: removed, 
                status: 'pass', 
                ts: new Date().toISOString(),
                risk: {
                    locDelta: locRisk,
                    totalLoc: totalLoc,
                    fileCount: task.files.length
                }
            };
            if (RUN_TESTS) {
                try {
                    console.log('[delegation] Running post-task lint (DELEGATION_RUN_TESTS=1)');
                    execSync('npm run lint --silent', { stdio: 'pipe' });
                    console.log('[delegation] Lint PASS');
                    console.log(`[delegation] Running post-task tests via ${TEST_SCRIPT}`);
                    execSync(`npm run ${TEST_SCRIPT} --silent`, { stdio: 'pipe', timeout: 1000 * 60 * 10 });
                    console.log('[delegation] Tests PASS');
                    baseEntry.qa = { lint: 'pass', tests: 'pass' };
                } catch (e: any) {
                    console.warn('[delegation] QA step failed', e?.message);
                    baseEntry.qa = { lint: 'unknown', tests: 'fail', error: (e as any)?.message?.slice(0, 200) };
                    // downgrade status to failed-tests for visibility
                    baseEntry.status = 'failed-tests';
                    task.status = 'failed';
                    // @ts-ignore
                    task.notes = 'qa_failed';
                }
            }
            appendLog(baseEntry);
        } else {
            task.status = 'failed';
            // @ts-ignore
            task.notes = `exit ${res.status}`;
            appendLog({ taskId: task.taskId, filesChanged: task.files.length, locAdded: 0, locRemoved: 0, status: 'failed', ts: new Date().toISOString(), notes: task.notes });
        }
    } catch (err: any) {
        task.status = 'failed';
        // @ts-ignore
        task.notes = err.message;
        appendLog({ taskId: task.taskId, filesChanged: task.files.length, locAdded: 0, locRemoved: 0, status: 'error', ts: new Date().toISOString(), notes: task.notes });
    }
    task.updatedAt = new Date().toISOString();
    changed = true;
    
    // Release lock after task completion
    releaseLock();
}

if (changed) writeQueue(tasks);
console.log('Queue processing complete.');
