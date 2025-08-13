#!/usr/bin/env ts-node
/** LOG-01 Coverage Audit: Fails if console.* used in P0 domains (api/, lib/neuroseo, stripe webhook, billing, ai/).
 * Allow list: migration scripts, test scripts, changelog generation, build scripts.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src');
const TARGET_DIRS = ['app/api', 'lib/neuroseo', 'lib/ai', 'lib/logging', 'lib/stripe'];
const ALLOW_PATTERNS = [/test/i, /scripts\//i, /__mocks__/];
const CONSOLE_REGEX = /\bconsole\.(log|error|warn|info|debug|trace)\s*\(/g;

interface Violation { file: string; line: number; snippet: string; }
const violations: Violation[] = [];

function scanFile(file: string) {
    const rel = path.relative(process.cwd(), file);
    if (!/\.(ts|tsx|js|mjs|cjs)$/.test(file)) return;
    if (ALLOW_PATTERNS.some(r => r.test(rel))) return;
    const text = fs.readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = CONSOLE_REGEX.exec(text))) {
        const before = text.lastIndexOf('\n', m.index) + 1;
        const line = text.slice(0, before).split('\n').length;
        const snippet = text.slice(before, text.indexOf('\n', before + 1));
        violations.push({ file: rel, line, snippet: snippet.trim().slice(0, 160) });
    }
}

function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        if (e.isDirectory()) { walk(path.join(dir, e.name)); continue; }
        scanFile(path.join(dir, e.name));
    }
}

for (const td of TARGET_DIRS) {
    const full = path.join(ROOT, td.replace(/^src\//, ''));
    if (fs.existsSync(full)) walk(full);
}

if (violations.length) {
    console.error('\x1b[31mConsole usage audit FAILED\x1b[0m');
    violations.slice(0, 50).forEach(v => console.error(` - ${v.file}:${v.line} ${v.snippet}`));
    if (violations.length > 50) console.error(` ... (${violations.length - 50} more)`);
    process.exit(1);
} else {
    console.log('Console usage audit passed (no disallowed console.* calls).');
}
