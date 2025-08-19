// Simple brain memory layer (initial minimal implementation)
// Purpose: append lightweight events from codex/aider/brain into a JSONL file for later context sampling.
// Future: could aggregate/summarize, dedupe, or build embeddings.

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface MemoryEvent {
    ts: number;
    source: 'codex' | 'aider' | 'brain';
    kind: string;            // e.g., task-complete, plan-generated
    id?: string;             // optional task/run id
    status?: string;         // success / fail / etc
    meta?: Record<string, unknown>;
}

const MEM_DIR = path.join(process.cwd(), 'artifacts', 'brain');
const MEM_FILE = path.join(MEM_DIR, 'memory.jsonl');

let lastTrigger = 0; // in‑process throttle guard
const TRIGGER_MIN_INTERVAL_MS = 30_000; // avoid rapid cascading triggers

// Simple in‑process cache of last signature => count accumulated (not persisted except via events with aggCount)
const lastByKey: Map<string, { ts: number; count: number }> = new Map();

export function recordMemory(ev: MemoryEvent) {
    try {
        // Enrich with temporal meta if absent
        try {
            const now = new Date(ev.ts || Date.now());
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dateStr = `${String(now.getDate()).padStart(2, '0')}-${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
            const melbTz = 'Australia/Melbourne';
            const fmt = new Intl.DateTimeFormat('en-AU', { timeZone: melbTz, hour: '2-digit', minute: '2-digit', hour12: true });
            const melbFmt = fmt.format(now);
            const m = melbFmt.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
            const melbTime = m ? `${m[1].padStart(2, '0')}:${m[2]} ${m[3].toUpperCase()}` : melbFmt;
            const getOffsetMinutes = (date: Date, timeZone: string) => {
                const f = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const parts: Record<string, string> = {}; for (const p of f.formatToParts(date)) if (p.type !== 'literal') parts[p.type] = p.value;
                const asUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
                return (asUTC - date.getTime()) / 60000;
            };
            const melbOffset = getOffsetMinutes(now, melbTz);
            const serverOffset = -now.getTimezoneOffset();
            const diff = melbOffset - serverOffset; const rounded = Math.round(diff);
            const sign = rounded >= 0 ? '+' : '-'; const abs = Math.abs(rounded); const dh = Math.floor(abs / 60); const dm = abs % 60;
            const delta = `${sign}${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}`;
            ev.meta = { ...(ev.meta || {}), date: ev.meta?.date || dateStr, melbTime: ev.meta?.melbTime || melbTime, utcDelta: ev.meta?.utcDelta || delta };
        } catch { }
        fs.mkdirSync(MEM_DIR, { recursive: true });
        // Deduplicate bursts: coalesce identical (source,kind,id,status) within 60s
        const key = `${ev.source}|${ev.kind}|${ev.id || ''}|${ev.status || ''}`;
        const now = Date.now();
        const prior = lastByKey.get(key);
        if (prior && (now - prior.ts) < 60_000) {
            prior.count += 1;
            prior.ts = now;
            // Rewrite tail line with updated aggCount if last line matches key; else append a compact aggregate line
            try {
                const raw = fs.existsSync(MEM_FILE) ? fs.readFileSync(MEM_FILE, 'utf8').trimEnd() : '';
                const lines = raw ? raw.split(/\n/) : [];
                if (lines.length) {
                    const last = lines[lines.length - 1];
                    try {
                        const parsed = JSON.parse(last);
                        if (parsed && parsed.__aggKey === key) {
                            parsed.aggCount = prior.count;
                            parsed.ts = now;
                            lines[lines.length - 1] = JSON.stringify(parsed);
                            fs.writeFileSync(MEM_FILE, lines.join('\n') + '\n');
                        } else {
                            fs.appendFileSync(MEM_FILE, JSON.stringify({ ...ev, __aggKey: key, aggCount: prior.count }) + '\n');
                        }
                    } catch { fs.appendFileSync(MEM_FILE, JSON.stringify({ ...ev, __aggKey: key, aggCount: prior.count }) + '\n'); }
                } else {
                    fs.appendFileSync(MEM_FILE, JSON.stringify({ ...ev, __aggKey: key, aggCount: prior.count }) + '\n');
                }
            } catch { }
        } else {
            lastByKey.set(key, { ts: now, count: 1 });
            fs.appendFileSync(MEM_FILE, JSON.stringify(ev) + '\n');
        }
        if (process.env.BRAIN_AUTOTRIGGER === '1') maybeTriggerBrain();
        // Special hook: if an ingested chat asks about TS fixes, we leave a hint event (handled externally)
        // Light pruning to keep memory bounded (retain last ~800 lines when exceeding 1200)
        try {
            const raw = fs.existsSync(MEM_FILE) ? fs.readFileSync(MEM_FILE, 'utf8') : '';
            if (raw) {
                const lines = raw.split(/\n/).filter(Boolean);
                if (lines.length > 1200) {
                    const keep = lines.slice(-800);
                    fs.writeFileSync(MEM_FILE, keep.join('\n') + '\n');
                }
            }
        } catch { /* pruning non-critical */ }
    } catch (e) {
        if (process.env.DEBUG_MEMORY) console.error('[memory] write failed', (e as Error).message);
    }
}

function brainDistReady() {
    return fs.existsSync(path.join(process.cwd(), 'dist', 'brain', 'scripts', 'brain', 'cli.js'));
}

function maybeTriggerBrain() {
    const now = Date.now();
    if (now - lastTrigger < TRIGGER_MIN_INTERVAL_MS) return;
    lastTrigger = now;
    const cmd = brainDistReady() ? 'node dist/brain/scripts/brain/cli.js --mode plan-only' : 'npm run brain:plan-only';
    const [exe, ...args] = cmd.split(/\s+/);
    const proc = spawn(exe, args, { stdio: 'ignore', detached: true, env: { ...process.env, BRAIN_AUTOTRIGGERED: '1' } });
    proc.unref();
}

export default { recordMemory };
