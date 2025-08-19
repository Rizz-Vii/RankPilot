// @ts-nocheck
/** Brain watch loop: periodically runs plan-only (or ask) and surfaces richer telemetry.
 * Env:
 *   BRAIN_INTERVAL_MS (default 180000) Increase interval to reduce churn (3m).
 *   BRAIN_MODE=plan-only|ask (default plan-only)
 *   BRAIN_VERBOSE=1  Show enhanced table (ask mode only)
 *   BRAIN_FULL=1      Include full enhancement ordering (not just top3)
 *   BRAIN_AUTODELEGATE=1  Auto-start delegation loop if urgent remediation (id 0) is top AND diagnostics show tsErrors>0 or lintErrors>0 and loop not running.
 *   BRAIN_AUTODELEGATE_COOLDOWN_MS (default 600000) Minimum ms between auto-start attempts.
 *   BRAIN_TICK_JSON=1  Persist each tick as JSON lines (artifacts/brain/watch-ticks.jsonl)
 *   BRAIN_ENQUEUE_TS=1  When urgent TS remediation is top, enqueue per-file TS fix tasks (cooldown)
 *   BRAIN_ENQUEUE_TS_COOLDOWN_MS (default 900000) 15m between per-file enqueue bursts
 */
import { spawn } from 'child_process';
import path from 'path';

const INTERVAL = Number(process.env.BRAIN_INTERVAL_MS || 180000);
const MODE = process.env.BRAIN_MODE === 'ask' ? 'ask' : 'plan-only';
let tick = 0;
let running = false;
let lastPreferred: any[] = [];
let lastAutoDelegate = 0;
let lastTsEnqueue = 0;

function readJsonSafe(p: string) { try { const fs = require('fs'); if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { } return undefined; }

function computeMissionDelta() {
    const cur = readJsonSafe('artifacts/brain/currentMission.json');
    const prev = readJsonSafe('artifacts/brain/previousMission.json');
    if (!cur) return { current: null, delta: null };
    if (!prev) return { current: cur, delta: null };
    try {
        return {
            current: { tsErrors: cur.diagnostics.typecheck.errors, lintErrors: cur.diagnostics.lint.errors, lintWarnings: cur.diagnostics.lint.warnings },
            delta: {
                tsErrors: cur.diagnostics.typecheck.errors - (prev.diagnostics?.typecheck?.errors || 0),
                lintErrors: cur.diagnostics.lint.errors - (prev.diagnostics?.lint?.errors || 0),
                lintWarnings: cur.diagnostics.lint.warnings - (prev.diagnostics?.lint?.warnings || 0)
            }
        };
    } catch { return { current: null, delta: null }; }
}

function isDelegationLoopRunning(): boolean {
    try {
        const { execSync } = require('child_process');
        const out = execSync("ps -eo cmd | grep 'delegate:loop' | grep -v grep || true", { encoding: 'utf8' });
        return /delegate:loop/.test(out);
    } catch { return false; }
}

function autoStartDelegationIfNeeded(parsed: any) {
    if (process.env.BRAIN_AUTODELEGATE !== '1') return;
    if (!parsed?.preferred?.length) return;
    const top = parsed.preferred[0];
    const ctx = parsed.context || {};
    const needs = top?.id === 0 && (ctx.tsErrors > 0 || ctx.lintErrors > 0);
    if (!needs) return;
    if (isDelegationLoopRunning()) return;
    const now = Date.now();
    const cooldown = Number(process.env.BRAIN_AUTODELEGATE_COOLDOWN_MS || 600000);
    if (now - lastAutoDelegate < cooldown) return;
    lastAutoDelegate = now;
    try {
        console.log('\x1b[33m[brain:watch] auto-starting delegation:loop (urgent remediation detected)\x1b[0m');
        const { spawn } = require('child_process');
        const proc = spawn('npm', ['run', 'delegate:loop'], { stdio: 'ignore', detached: true, env: { ...process.env } });
        proc.unref();
    } catch (e) {
        console.log('\x1b[31m[brain:watch] failed to auto-start delegation loop:\x1b[0m', (e as any)?.message);
    }
}

function enqueuePerFileTsFixIfNeeded(parsed: any) {
    if (process.env.BRAIN_ENQUEUE_TS !== '1') return;
    const ctx = parsed?.context || {};
    if (!ctx.tsErrors || ctx.tsErrors <= 0) return;
    const top = parsed.preferred?.[0];
    if (!(top && top.id === 0)) return; // only when urgent TS is top
    const now = Date.now();
    const cooldown = Number(process.env.BRAIN_ENQUEUE_TS_COOLDOWN_MS || 900000);
    if (now - lastTsEnqueue < cooldown) return;
    lastTsEnqueue = now;
    try {
        const { spawnSync } = require('child_process');
        const tc = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8' });
        const out = (tc.stdout || '') + '\n' + (tc.stderr || '');
        const fileMatches = Array.from(new Set(out.split(/\n/).map(l => {
            const m = l.match(/^(.*?\.(?:ts|tsx)):(\d+):(\d+) - error TS/);
            return m ? m[1] : null;
        }).filter(Boolean)));
        if (!fileMatches.length) return;
        const fs = require('fs');
        const qFile = 'sessions/aider-queue.jsonl';
        if (!fs.existsSync(qFile)) return;
        const lines = fs.readFileSync(qFile, 'utf8').trim().split(/\n/);
        const existing = new Set(lines.slice(1).map((l: string) => { try { return JSON.parse(l).taskId; } catch { return ''; } }));
        const nowIso = new Date().toISOString();
        const toAdd: string[] = [];
        let added = 0;
        for (const f of fileMatches.slice(0, 5)) { // cap to 5 per burst
            const safeId = f.replace(/[^a-zA-Z0-9_-]/g, '_');
            const taskId = `TS-FIX-${safeId}`.slice(0, 120);
            if (existing.has(taskId)) continue;
            const msg = { taskId, summary: `Fix TypeScript errors in ${f}`, status: 'pending', createdAt: nowIso, updatedAt: nowIso, files: [f], message: `Open ${f} and resolve reported TS errors.` };
            toAdd.push(JSON.stringify(msg));
            added += 1; if (added >= 5) break;
        }
        if (toAdd.length) {
            fs.appendFileSync(qFile, toAdd.join('\n') + '\n');
            console.log(`\x1b[33m[brain:watch] enqueued ${toAdd.length} TS fix tasks\x1b[0m`);
        }
    } catch (e) {
        console.log('\x1b[31m[brain:watch] enqueue TS fix failed:\x1b[0m', (e as any)?.message);
    }
}

function formatEnhancements(list: any[]) {
    const rows = list.map((e: any) => ({ r: e.rank, id: e.id, title: e.title, score: Number(String(e.reason).match(/score=(\d+)/)?.[1] || 0) }));
    const wTitle = Math.min(60, Math.max(20, ...rows.map(r => r.title.length)));
    const header = ` #  | ID | Score | Title`.padEnd(wTitle + 20);
    const sep = '-'.repeat(header.length);
    const lines = rows.map(r => {
        const ch = lastPreferred.find((p: any) => p.id === r.id);
        let delta = '';
        if (ch) {
            const prevRank = ch.rank; const dr = prevRank - r.r;
            if (dr > 0) delta = `↑${dr}`; else if (dr < 0) delta = `↓${-dr}`; else delta = '·';
        } else delta = '✚';
        return `${String(r.r).padStart(2, ' ')} | ${String(r.id).padStart(2, ' ')} | ${String(r.score).padStart(5, ' ')} | ${r.title.slice(0, wTitle)} ${delta}`;
    });
    return header + '\n' + sep + '\n' + lines.join('\n');
}

function runOnce() {
    if (running) return;
    running = true;
    tick += 1;
    const started = Date.now();
    const cli = path.join('dist', 'brain', 'scripts', 'brain', 'cli.js');
    const args = ['--mode', MODE];
    if (MODE === 'ask') args.push('--json');
    const proc = spawn('node', [cli, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { out += d.toString(); });
    proc.on('exit', (code) => {
        const dur = Date.now() - started;
        const ts = new Date().toISOString();
        try {
            if (MODE === 'ask' && process.env.BRAIN_VERBOSE === '1') {
                try {
                    const jsonLine = out.split(/\n/).filter(l => l.trim().startsWith('{')).pop();
                    if (jsonLine) {
                        const parsed = JSON.parse(jsonLine);
                        const ctx = parsed.context || {};
                        const list = parsed.preferred || [];
                        const top3 = list.slice(0, 3).map((p: any) => `#${p.rank}:${p.title}`).join(' | ');
                        const base = `\x1b[35m[brain:watch]\x1b[0m ${ts} tick=${tick} dur=${dur}ms ctx(TS=${ctx.tsErrors} LintE=${ctx.lintErrors} LintW=${ctx.lintWarnings}) top3=${top3}`;
                        console.log(base);
                        if (process.env.BRAIN_FULL === '1' && list.length) {
                            console.log(formatEnhancements(list));
                        }
                        autoStartDelegationIfNeeded(parsed);
                        enqueuePerFileTsFixIfNeeded(parsed);
                        const md = computeMissionDelta();
                        if (md.delta) {
                            console.log(`\x1b[90m[brain:watch] missionΔ TS=${md.delta.tsErrors >= 0 ? '+' + md.delta.tsErrors : md.delta.tsErrors} LintE=${md.delta.lintErrors >= 0 ? '+' + md.delta.lintErrors : md.delta.lintErrors} LintW=${md.delta.lintWarnings >= 0 ? '+' + md.delta.lintWarnings : md.delta.lintWarnings}\x1b[0m`);
                        }
                        if (process.env.BRAIN_TICK_JSON === '1') {
                            try { const fs = require('fs'); fs.mkdirSync('artifacts/brain', { recursive: true }); const rec = { ts: Date.now(), tick, durationMs: dur, context: ctx, enhancements: list, mission: md.current, missionDelta: md.delta }; fs.appendFileSync('artifacts/brain/watch-ticks.jsonl', JSON.stringify(rec) + '\n'); } catch { }
                        }
                        lastPreferred = list.map((x: any) => ({ id: x.id, rank: x.rank }));
                    } else {
                        console.log(`\x1b[35m[brain:watch]\x1b[0m ${ts} tick=${tick} dur=${dur}ms (no json)`);
                    }
                } catch (e) {
                    console.log(`\x1b[35m[brain:watch]\x1b[0m ${ts} tick=${tick} parse-error ${(e as any).message}`);
                }
            } else {
                console.log(`\x1b[35m[brain:watch]\x1b[0m ${ts} tick=${tick} mode=${MODE} dur=${dur}ms code=${code}`);
            }
        } catch {/* ignore */ }
        running = false;
    });
}

setInterval(runOnce, INTERVAL);
runOnce();
