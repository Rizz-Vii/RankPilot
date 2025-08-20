#!/usr/bin/env ts-node
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
// Prefer require for interop; fallback to global attached by queue-utils
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qu = require('./queue-utils.ts') || (globalThis as any).__QUEUE_UTILS__;
const readQueue = qu.readQueue as () => any[];
const writeQueue = qu.writeQueue as (tasks: any[]) => void;

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
        } catch {
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
// Validation thresholds (restored to baseline after large-file remediation strategy introduced).
// Baseline: single 80KB, aggregate 40KB. Large monolith files can now be processed via
// segmented tasks that specify a line range in the task.message (see validateTask).
const MAX_FILE_BYTES = 80 * 1024; // single file guard (~80KB)
const MAX_AGG_BYTES = 40 * 1024;  // aggregate soft cap (~40KB)
const LOG_ROTATE_BYTES = 200 * 1024; // rotate aide log after 200KB
const EXT_ALLOW = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.css']);

// Extend task type at runtime with optional message support (not persisted in strict schema yet)
type DelegationTask = ReturnType<typeof readQueue>[number] & { message?: string };
const tasks = readQueue() as DelegationTask[];
let changed = false;

const LOG_FILE = path.resolve('sessions/aider-log.jsonl');
function appendLog(entry: unknown): void {
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

function validateFiles(files: string[]): { details: { file: string; size: number; ok: boolean; reason?: string }[]; aggregateBytes: number; aggregateTooLarge: boolean; risk: string } {
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

/**
 * Enhanced task validation that supports segmented large-file processing.
 * If a task targets a single file exceeding size limits BUT includes a message with a
 * line range hint (e.g., "lines 1-600" or "Lines 1201-1800"), we treat the effective
 * working set size as the proportional byte span of those lines. This allows keeping
 * global size thresholds strict while still remediating large legacy files incrementally.
 */
function validateTask(task: DelegationTask): any {
    const base = validateFiles(task.files);
    // Only attempt segment logic for single-file tasks that otherwise fail due to size.
    if (task.files.length === 1 && (base.risk === 'aggregate_too_large' || base.risk === 'large_file')) {
        const msg = (task.message || task.summary || '').toLowerCase();
        const m = msg.match(/lines?\s+(\d+)\s*(?:-|to|–|—)\s*(\d+)/i);
        if (m) {
            const start = parseInt(m[1], 10);
            const end = parseInt(m[2], 10);
            if (!isNaN(start) && !isNaN(end) && end > start) {
                const filePath = task.files[0];
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split(/\n/);
                    const totalLines = lines.length || 1;
                    const clampedStart = Math.max(1, Math.min(start, totalLines));
                    const clampedEnd = Math.max(clampedStart + 1, Math.min(end, totalLines));
                    // Approximate bytes for segment using proportional length to entire file size
                    const stat = fs.statSync(filePath);
                    const fileBytes = stat.size;
                    const segmentLines = (clampedEnd - clampedStart + 1);
                    const estSegmentBytes = Math.max(1, Math.round((segmentLines / totalLines) * fileBytes));
                    // If the estimated segment bytes fit within thresholds, downgrade risk to ok.
                    if (estSegmentBytes <= MAX_AGG_BYTES) {
                        return { ...base, risk: 'ok', segment: { start: clampedStart, end: clampedEnd, estBytes: estSegmentBytes, fileBytes } };
                    }
                } catch { /* ignore segment attempt */ }
            }
        }
    }
    return base;
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

for (const task of tasks) {
    if (task.status !== 'pending') continue;
    // Defensive: some tasks (e.g. Brain generic plan steps) may enqueue without a concrete files list.
    if (!Array.isArray((task as any).files) || !(task as any).files.length) {
        // Mark them failed (or skipped) so they don't stall the queue endlessly.
        const note = 'no_files_attached';
        console.log(`[delegation] skipping ${task.taskId} (${task.summary || ''}) – ${note}`);
        (task as any).notes = note;
        task.status = 'failed';
        task.updatedAt = new Date().toISOString();
        appendLog({ taskId: task.taskId, filesChanged: 0, status: 'failed', ts: new Date().toISOString(), notes: note });
        changed = true;
        continue;
    }
    task.status = 'running';
    task.updatedAt = new Date().toISOString();
    changed = true;
    writeQueue(tasks);
    console.log(`Processing ${task.taskId} (${task.files.length} files) mode=${AIDER_AUTORUN ? 'autorun' : 'manual'}`);
    const validation = validateTask(task);
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
        appendLog({ taskId: task.taskId, filesChanged: task.files.length, locAdded: added, locRemoved: removed, status: 'pass', ts: new Date().toISOString(), notes: 'direct_delete' });
        task.updatedAt = new Date().toISOString();
        changed = true;
        continue;
    }

    if (!AIDER_AUTORUN) {
        console.log(`[delegation] AIDER_AUTORUN not set – leaving task ${task.taskId} pending (manual mode).`);
        console.log('Manual run suggestion (after installing aider):');
        console.log(`  aider --model ${MODEL} ${task.files.join(' ')}`);
        console.log('Hint: run with AIDER_AUTORUN=1 (or use npm run delegate:process:auto) to execute automatically.');
        task.status = 'pending';
        task.updatedAt = new Date().toISOString();
        continue;
    }
    try {
        const analyticsDir = path.resolve('.codex/tmp');
        const analyticsLog = path.join(analyticsDir, 'aider-analytics.jsonl');
        const aiderArgs = ['--model', MODEL, ...AIDER_ARGS, ...task.files, '--yes', '--analytics', '--analytics-log', analyticsLog];
        const isLintTask = /^AI-LINT-/i.test(task.taskId);
        const lintPrompt = isLintTask ? `You are a strict TypeScript & ESLint refactorer.
Given the repository file(s), resolve ONLY the lint rule indicated in the task summary.
Do NOT introduce unrelated refactors, formatting churn, or dependency changes.
Maintain public API shapes. Avoid broad type widening; prefer local narrowing.
If no changes are needed (already compliant) output the unchanged file.
Task Summary: ${task.summary}
Rules Focus: infer rule id from summary; fix occurrences safely.
` : '';
        const fallbackMessage = 'Apply requested mechanical edits described by task summary: ' + task.summary + ' (idempotent). If already applied, make no changes.';
        const effectiveMessage = (task as any).message && typeof (task as any).message === 'string' && (task as any).message.trim().length ? (task as any).message.trim() : (lintPrompt + fallbackMessage);
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
        fs.mkdirSync(analyticsDir, { recursive: true });
        const res = spawnSync('aider', aiderArgs, { stdio: 'inherit' });
        // Parse analytics log for token usage (latest line with token fields)
        try {
            /** Extract token stats from a raw analytics JSON object. */
            const extractTokens = (raw: any): { input_tokens: number; output_tokens: number; tool_calls: number } | null => {
                if (!raw || typeof raw !== 'object') return null;
                const src = (raw.properties && typeof raw.properties === 'object') ? raw.properties : raw; // aide places fields under properties
                const inTok = src.prompt_tokens ?? src.input_tokens ?? src.total_prompt_tokens ?? null;
                const outTok = src.completion_tokens ?? src.output_tokens ?? src.total_completion_tokens ?? null;
                if (typeof inTok === 'number' || typeof outTok === 'number') {
                    return {
                        input_tokens: typeof inTok === 'number' ? inTok : 0,
                        output_tokens: typeof outTok === 'number' ? outTok : 0,
                        tool_calls: typeof (src.tool_calls === 'number' ? src.tool_calls : raw.tool_calls) === 'number' ? (src.tool_calls ?? raw.tool_calls ?? 0) : 0
                    };
                }
                return null;
            };
            let tokenStats: any = { input_tokens: 0, output_tokens: 0, tool_calls: 0 };
            if (fs.existsSync(analyticsLog)) {
                const lines = fs.readFileSync(analyticsLog, 'utf8').trim().split(/\n/).filter(Boolean);
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const obj = JSON.parse(lines[i]);
                        const found = extractTokens(obj);
                        if (found) { tokenStats = found; break; }
                    } catch { /* continue */ }
                }
                // Fallback: if still zero, scan forward for *any* message_send event with tokens
                if (tokenStats.input_tokens === 0 && tokenStats.output_tokens === 0) {
                    for (let i = 0; i < lines.length; i++) {
                        try {
                            const obj = JSON.parse(lines[i]);
                            const found = extractTokens(obj);
                            if (found) { tokenStats = found; break; }
                        } catch { /* ignore */ }
                    }
                }
            }
            // include total for convenience
            if (typeof (tokenStats as any).input_tokens === 'number' && typeof (tokenStats as any).output_tokens === 'number') {
                (tokenStats as any).total_tokens = (tokenStats as any).input_tokens + (tokenStats as any).output_tokens;
            }
            fs.writeFileSync(path.join(analyticsDir, 'last-token-stats.json'), JSON.stringify(tokenStats));
        } catch { /* ignore token stats errors */ }
        if (res.status === 0) {
            task.status = 'done';
            const { added, removed } = computeLocDelta(task.files);
            const baseEntry: any = { taskId: task.taskId, filesChanged: task.files.length, locAdded: added, locRemoved: removed, status: 'pass', ts: new Date().toISOString() };
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
}

if (changed) writeQueue(tasks);
console.log('Queue processing complete.');
