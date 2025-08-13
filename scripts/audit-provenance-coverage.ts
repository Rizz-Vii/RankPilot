#!/usr/bin/env ts-node
/** PROV-01: Provenance Coverage Audit
 * Enumerates API route files and heuristically checks for enforceProvenance / withProvenance usage or explicit __provenance assignment.
 * Fails (exit 1) if any route appears AI-related (contains 'ai'|'neuroseo'|'marketing' patterns) and lacks provenance markers.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src/app/api');
// Narrow hints to reduce false positives on non-AI operational endpoints.
const AI_HINTS = [
    /\/ai\//i,
    /neuroseo\/(?!metrics)/i,
    /automation\/(?!run-due)/i,
    /competitive/i,
    /conversational-seo/i,
    /multi-model/i,
    /insights\/stream/i,
    /seo-audit\/run/i,
];
const PROV_MARKERS = [/enforceProvenance/, /withProvenance/, /__provenance\s*:/];

// Optional exemption list (exact relative file paths) for documented reasons (see PROVENANCE_POLICY.md)
const EXEMPTIONS = new Set<string>([
    // 'src/app/api/automation/run-due/route.ts' // example deprecated endpoint (currently enforced)
]);

const STRICT = process.env.PROV_STRICT === '1'; // when enabled, require withProvenance for non-streaming AI routes

interface Finding { file: string; reason: string }

function walk(dir: string, acc: string[]) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full, acc);
        else if (entry === 'route.ts' || entry.endsWith('.ts')) acc.push(full);
    }
    return acc;
}

const files = walk(ROOT, []);
const violations: Finding[] = [];
files.forEach(f => {
    const txt = fs.readFileSync(f, 'utf8');
    const aiRelated = AI_HINTS.some(r => r.test(f));
    if (!aiRelated) return;
    const rel = path.relative(process.cwd(), f);
    if (EXEMPTIONS.has(rel)) return;
    const hasMarker = PROV_MARKERS.some(r => r.test(txt));
    if (!hasMarker) {
        violations.push({ file: path.relative(process.cwd(), f), reason: 'No provenance marker heuristically detected' });
        return;
    }
    if (STRICT) {
        // If handler is not streaming (no enforceProvenanceOnChunk) prefer withProvenance usage for consistency
        const isStreaming = /enforceProvenanceOnChunk/.test(txt);
        if (!isStreaming && !/withProvenance/.test(txt)) {
            violations.push({ file: rel, reason: 'Strict mode: missing withProvenance wrapper' });
        }
    }
});

if (violations.length) {
    console.error('Provenance coverage audit FAILED');
    console.error(JSON.stringify({ violations }, null, 2));
    process.exit(1);
} else {
    console.log('Provenance coverage audit PASS');
}
