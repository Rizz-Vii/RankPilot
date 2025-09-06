#!/usr/bin/env ts-node
/**
 * Aggregates ui-data-population-report.ndjson into a markdown summary.
 */
import fs from 'fs';
import path from 'path';

const REPORT = path.join(process.cwd(), 'test-results', 'ui-data-population-report.ndjson');
const OUT = path.join(process.cwd(), 'test-results', 'ui-data-population-summary.md');

interface Entry { ts: number; label: string; path: string; status: string; reason?: string; attempts?: number; count?: number; degrade?: boolean; }

function load(): Entry[] {
    if (!fs.existsSync(REPORT)) return [];
    return fs.readFileSync(REPORT, 'utf8').trim().split(/\n+/).filter(Boolean).map(l => {
        try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean) as Entry[];
}

function summarize(entries: Entry[]) {
    const byLabel: Record<string, Entry[]> = {};
    for (const e of entries) {
        byLabel[e.label] = byLabel[e.label] || []; byLabel[e.label].push(e);
    }
    const lines: string[] = [];
    lines.push('# UI Data Population Summary');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    if (!entries.length) { lines.push('_No entries logged._'); return lines.join('\n'); }
    const latest: Entry[] = Object.values(byLabel).map(list => list.sort((a, b) => b.ts - a.ts)[0]);
    latest.sort((a, b) => a.label.localeCompare(b.label));
    lines.push('| Segment | Path | Status | Reason | Attempts | Count |');
    lines.push('|---------|------|--------|--------|----------|-------|');
    for (const e of latest) {
        lines.push(`| ${e.label} | ${e.path} | ${e.status}${e.degrade ? ' (degraded)' : ''} | ${e.reason || ''} | ${e.attempts ?? ''} | ${e.count ?? ''} |`);
    }
    const failures = latest.filter(e => e.status === 'failed');
    if (failures.length) {
        lines.push('\n## Failures');
        for (const f of failures) {
            lines.push(`- ${f.label}: ${f.reason || 'failed'} (attempts=${f.attempts})`);
        }
    }
    return lines.join('\n');
}

(async () => {
    const entries = load();
    const md = summarize(entries);
    await fs.promises.writeFile(OUT, md, 'utf8');
    console.log('UI data population summary written to', OUT);
})();
