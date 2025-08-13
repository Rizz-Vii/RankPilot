#!/usr/bin/env ts-node
/** Lint Provenance Wrappers (PROV-01)
 * AST-light heuristic: ensure every non-streaming AI route (heuristic directories) exports handlers via withProvenance.
 * Streaming routes using enforceProvenanceOnChunk are excluded.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src/app/api');
const AI_PATH_HINT = /(ai\/.+|neuroseo\/.+|automation\/.+|seo-audit\/run|mcp\/neuroseo\/enhanced)/i;

interface Finding { file: string; reason: string }
const findings: Finding[] = [];

function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (/route\.ts$/.test(entry)) check(full);
    }
}

function check(file: string) {
    const rel = path.relative(process.cwd(), file);
    if (!AI_PATH_HINT.test(rel)) return;
    const src = fs.readFileSync(file, 'utf8');
    const isStreaming = /enforceProvenanceOnChunk/.test(src) || /text\/event-stream/.test(src);
    if (isStreaming) return; // skip streaming
    const exportsWith = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*withProvenance/.test(src);
    if (!exportsWith) findings.push({ file: rel, reason: 'missing withProvenance wrapper export' });
}

walk(ROOT);

if (findings.length) {
    console.error('Provenance wrapper lint FAIL');
    findings.forEach(f => console.error(` - ${f.file}: ${f.reason}`));
    process.exit(1);
} else {
    console.log('Provenance wrapper lint PASS');
}
