#!/usr/bin/env ts-node
/**
 * validate-aider-log.ts
 * Validate sessions/aider-log.jsonl structure & size.
 * - Each non-meta line must parse and include required fields.
 * - Warn if file >200KB.
 */
import fs from 'fs';
import path from 'path';

const LOG_PATH = path.resolve('sessions/aider-log.jsonl');
const REQUIRED = ['taskId', 'filesChanged', 'locAdded', 'locRemoved', 'status', 'ts'];

function run() {
    if (!fs.existsSync(LOG_PATH)) {
        console.error(`[error] Missing log file: ${LOG_PATH}`);
        process.exit(1);
    }
    const { size } = fs.statSync(LOG_PATH);
    const kb = size / 1024;
    if (kb > 200) console.warn(`[warn] Size ${kb.toFixed(1)}KB exceeds 200KB rotation threshold.`);
    const lines = fs.readFileSync(LOG_PATH, 'utf8').split(/\n/).filter(l => l.trim().length);
    let errors = 0;
    lines.forEach((line, i) => {
        if (i === 0 && line.includes('meta')) return;
        try {
            const parsed: unknown = JSON.parse(line);
            const obj = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
            for (const f of REQUIRED) if (!(f in obj)) { console.error(`[error] Line ${i + 1} missing field ${f}`); errors++; }
            const locAdded = obj['locAdded'];
            const locRemoved = obj['locRemoved'];
            if (typeof locAdded !== 'number' || typeof locRemoved !== 'number') { console.error(`[error] Line ${i + 1} locAdded/locRemoved must be numbers`); errors++; }
        } catch (e: unknown) {
            const msg = (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') ? (e as { message: string }).message : 'Unknown parse error';
            console.error(`[error] Line ${i + 1} invalid JSON: ${msg}`);
            errors++;
        }
    });
    if (errors) { console.error(`Validation failed: ${errors} error(s).`); process.exit(2); }
    console.log(`Validation OK: ${lines.length - 1} record(s), size ${kb.toFixed(1)}KB.`);
}

run();
