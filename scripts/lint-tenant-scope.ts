#!/usr/bin/env ts-node
/** SEC-01 / GOV-01: Tenant Scope Linter
 * Scans Firestore query construction for collection('X') patterns missing userId/teamId scoping in path or nearby code.
 * Heuristic only; flags suspicious lines for manual review (non-blocking initially).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src');
const TARGET_EXT = /\.(ts|tsx|js|mjs)$/;
const SCOPE_HINTS = /(userId|teamId|uid)\b/;
const COLLECTION_CALL = /\.collection\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

interface Finding { file: string; line: number; collection: string; code: string; }
const findings: Finding[] = [];

function scanFile(file: string) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\n/);
    lines.forEach((line, idx) => {
        if (!/\.collection\(/.test(line)) return;
        let m: RegExpExecArray | null;
        while ((m = COLLECTION_CALL.exec(line))) {
            const coll = m[1];
            if (/^_/.test(coll)) continue; // internal
            const windowText = [lines[idx - 1] || '', line, lines[idx + 1] || ''].join(' ');
            if (!SCOPE_HINTS.test(windowText)) {
                findings.push({ file: path.relative(process.cwd(), file), line: idx + 1, collection: coll, code: line.trim().slice(0, 180) });
            }
        }
    });
}

function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full); else if (TARGET_EXT.test(entry.name)) scanFile(full);
    }
}

walk(ROOT);

if (findings.length) {
    console.error('\x1b[33mTenant scope linter: potential unscoped queries found (report written).\x1b[0m');
    findings.slice(0, 80).forEach(f => console.error(` - ${f.file}:${f.line} collection=${f.collection} :: ${f.code}`));
    fs.writeFileSync('tenant-scope-report.json', JSON.stringify({ findings }, null, 2));
    process.exit(0); // soft for now; later escalate to failure
} else {
    console.log('Tenant scope linter: no potential unscoped queries detected');
}
