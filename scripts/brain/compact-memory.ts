import fs from 'fs';
import path from 'path';
import { createGzip } from 'zlib';

/**
 * Compact brain memory log (memory.jsonl) by capping line count and archiving overflow.
 * Env:
 *   MAX_MEMORY_LINES (default 5000)
 *   ARCHIVE_BATCH (default 2000)
 *   DRY_RUN=1 -> no writes
 */

const DIR = path.resolve('artifacts/brain');
const FILE = path.join(DIR, 'memory.jsonl');
const ARCHIVE_DIR = path.join(DIR, 'archive');
const MAX = Number(process.env.MAX_MEMORY_LINES || 5000);
const BATCH = Number(process.env.ARCHIVE_BATCH || 2000);
const DRY = process.env.DRY_RUN === '1';

function log(msg: string) { console.log(`[brain:memory-compact] ${msg}`); }

if (!fs.existsSync(FILE)) { log('memory.jsonl missing'); process.exit(0); }
const raw = fs.readFileSync(FILE, 'utf8').trim();
if (!raw) { log('memory.jsonl empty'); process.exit(0); }
const lines = raw.split(/\n/);
if (lines.length <= MAX) { log(`within limit (${lines.length}/${MAX})`); process.exit(0); }

const toArchive = lines.slice(0, Math.min(BATCH, lines.length - MAX));
const remaining = lines.slice(toArchive.length);
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const archivePath = path.join(ARCHIVE_DIR, `memory-archive-${stamp}.jsonl.gz`);
log(`archiving ${toArchive.length} lines -> ${archivePath}`);
if (!DRY) {
    const gz = createGzip();
    const out = fs.createWriteStream(archivePath);
    gz.end(toArchive.join('\n') + '\n');
    gz.pipe(out);
    out.on('close', () => log('archive written'));
    fs.writeFileSync(FILE, remaining.join('\n') + '\n');
    log(`memory.jsonl trimmed to ${remaining.length} lines`);
} else {
    log('DRY_RUN=1');
}
