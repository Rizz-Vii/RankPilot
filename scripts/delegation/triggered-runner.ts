#!/usr/bin/env ts-node
/**
 * Triggered Runner
 * Watches the delegation trigger file emitted by the planner-only loop
 * (two-agent-plan-loop) and, when it changes, runs the delegation processor
 * (`delegate:process`) until the queue drains or a max pass limit is reached.
 *
 * Environment Variables:
 *   TWO_AGENT_DELEGATION_TRIGGER_FILE  (path to trigger file; default .codex/tmp/delegation-trigger.signal)
 *   TRIGGERED_RUNNER_INTERVAL_MS       (poll interval when fs.watch not firing; default 5000)
 *   TRIGGERED_RUNNER_MAX_PASSES        (max consecutive delegate:process passes per trigger; default 3)
 *   TRIGGERED_RUNNER_IDLE_EXIT_MIN     (exit after N idle minutes without new trigger; default 0 = never)
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TRIGGER_FILE = path.resolve(process.env.TWO_AGENT_DELEGATION_TRIGGER_FILE || '.codex/tmp/delegation-trigger.signal');
const POLL_MS = Number(process.env.TRIGGERED_RUNNER_INTERVAL_MS || 5000);
const MAX_PASSES = Number(process.env.TRIGGERED_RUNNER_MAX_PASSES || 3);
const IDLE_EXIT_MIN = Number(process.env.TRIGGERED_RUNNER_IDLE_EXIT_MIN || 0);
let lastMtime = 0;
let lastTriggerTs = Date.now();

function nowISO() { return new Date().toISOString(); }

function processQueuePass(): number {
    const res = spawnSync('npm', ['run', 'delegate:process'], { stdio: 'inherit', env: { ...process.env, AIDER_AUTORUN: '1' } });
    return res.status ?? 0;
}

function handleTrigger(mtimeMs: number) {
    lastTriggerTs = Date.now();
    console.log(`[triggered-runner] trigger detected at ${nowISO()} mtime=${mtimeMs}`);
    for (let pass = 1; pass <= MAX_PASSES; pass++) {
        console.log(`[triggered-runner] pass ${pass}/${MAX_PASSES}`);
        const code = processQueuePass();
        if (code !== 0) {
            console.warn(`[triggered-runner] delegate:process exit code=${code}; aborting trigger cycle`);
            break;
        }
        // Up to MAX_PASSES; if tasks keep appearing, planner will emit new trigger.
    }
    console.log('[triggered-runner] trigger cycle complete');
}

function poll() {
    try {
        if (fs.existsSync(TRIGGER_FILE)) {
            const st = fs.statSync(TRIGGER_FILE);
            if (st.mtimeMs > lastMtime) {
                lastMtime = st.mtimeMs;
                handleTrigger(st.mtimeMs);
            }
        }
    } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e && typeof (e as Record<string, unknown>).message === 'string' ? (e as Record<string, unknown>).message as string : String(e);
        console.warn('[triggered-runner] poll error', msg);
    }
    if (IDLE_EXIT_MIN > 0) {
        const idleMin = (Date.now() - lastTriggerTs) / 60000;
        if (idleMin >= IDLE_EXIT_MIN) {
            console.log(`[triggered-runner] idle ${idleMin.toFixed(2)}m >= ${IDLE_EXIT_MIN}m; exiting.`);
            process.exit(0);
        }
    }
    setTimeout(poll, POLL_MS);
}

function initWatch() {
    try { fs.mkdirSync(path.dirname(TRIGGER_FILE), { recursive: true }); } catch { /* ignore */ }
    if (fs.existsSync(TRIGGER_FILE)) {
        try { lastMtime = fs.statSync(TRIGGER_FILE).mtimeMs; } catch { /* ignore */ }
    }
    try {
        fs.watch(path.dirname(TRIGGER_FILE), (evt, filename) => {
            if (!filename) return;
            if (path.resolve(path.dirname(TRIGGER_FILE), filename.toString()) === TRIGGER_FILE && fs.existsSync(TRIGGER_FILE)) {
                try {
                    const st = fs.statSync(TRIGGER_FILE);
                    if (st.mtimeMs > lastMtime) {
                        lastMtime = st.mtimeMs;
                        handleTrigger(st.mtimeMs);
                    }
                } catch { /* ignore */ }
            }
        });
        console.log(`[triggered-runner] watching ${TRIGGER_FILE}`);
    } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e && typeof (e as Record<string, unknown>).message === 'string' ? (e as Record<string, unknown>).message as string : String(e);
        console.warn('[triggered-runner] fs.watch failed; relying on polling', msg);
    }
    setTimeout(poll, POLL_MS);
}

initWatch();
