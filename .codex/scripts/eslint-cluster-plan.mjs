#!/usr/bin/env node
import fs from 'fs';

// Gracefully handle downstream pipe closures (e.g., piping to `head`).
process.stdout.on('error', (err) => {
    if (err && err.code === 'EPIPE') {
        try { process.exit(0); } catch { /* ignore */ }
    } else {
        // Re-throw unexpected errors
        throw err;
    }
});

function loadReport(p) {
    const txt = fs.readFileSync(p, 'utf8');
    try { const parsed = JSON.parse(txt); if (Array.isArray(parsed) && parsed.length) return parsed; } catch { }
    return recoverFromText(txt);
}
function recoverFromText(txt) {
    const fileRegex = /"filePath":"([^"]+)"/g; const indices = []; let m;
    while ((m = fileRegex.exec(txt))) indices.push({ filePath: m[1], start: m.index });
    if (!indices.length) return [];
    const files = []; for (let i = 0; i < indices.length; i++) { const { filePath, start } = indices[i]; const end = i + 1 < indices.length ? indices[i + 1].start : txt.length; const segment = txt.slice(start, end); const ruleMatches = segment.match(/"ruleId":"(.*?)"/g) || []; const messages = ruleMatches.map(r => ({ ruleId: /"ruleId":"(.*?)"/.exec(r)?.[1], message: '', line: 0, severity: 0 })); if (messages.length) files.push({ filePath, messages }); }
    return files;
}
function cluster(files) {
    const buckets = {};
    for (const f of files) {
        const ruleCounts = {};
        for (const m of f.messages) { if (!m.ruleId) continue; ruleCounts[m.ruleId] = (ruleCounts[m.ruleId] || 0) + 1; }
        for (const [rule, count] of Object.entries(ruleCounts)) {
            if (!buckets[rule]) buckets[rule] = { rule, items: [], total: 0 };
            buckets[rule].items.push({ file: f.filePath, count });
            buckets[rule].total += count;
        }
    }
    return Object.values(buckets).sort((a, b) => b.total - a.total);
}
function toQueueLines(clusters, limit = 10) {
    const maxTasksPerRule = 4;
    const maxAggregateBytes = parseInt(process.env.CLUSTER_MAX_AGG || '38000', 10);
    const maxFilesPerTask = 15;
    const segmentLineTarget = parseInt(process.env.CLUSTER_SEGMENT_LINES || '900', 10);
    const largeFileByteThreshold = parseInt(process.env.CLUSTER_LARGE_FILE_BYTES || '80000', 10);
    const exclusions = (process.env.CLUSTER_EXCLUDE_PATTERNS || 'functions/src/lib/finance,firestore.rules').split(',').map(s => s.trim()).filter(Boolean);
    const lines = []; const nowISO = () => new Date().toISOString();
    for (const c of clusters.slice(0, limit)) {
        const safeRule = c.rule.replace(/\//g, '_');
        const filteredItems = c.items.filter(it => !exclusions.some(ex => ex && it.file.includes(ex)));
        let segmented = false;
        if (filteredItems.length) {
            let largestFile = filteredItems[0].file; let largestSize = 0;
            try { largestSize = fs.statSync(largestFile).size; } catch { }
            for (const it of filteredItems.slice(1)) { try { const s = fs.statSync(it.file).size; if (s > largestSize) { largestSize = s; largestFile = it.file; } } catch { } }
            if (filteredItems.length === 1 || largestSize >= largeFileByteThreshold) {
                try {
                    const text = fs.readFileSync(largestFile, 'utf8');
                    const totalLines = text.split(/\n/).length;
                    let start = 1; let seg = 1;
                    while (start <= totalLines) {
                        const end = Math.min(totalLines, start + segmentLineTarget - 1);
                        const summary = `Fix ESLint rule ${c.rule} (lines ${start}-${end}) segment ${seg}`;
                        lines.push(JSON.stringify({ taskId: `LINT-${safeRule}-S${seg}`, summary, files: [largestFile], status: 'pending', estLoc: Math.min(180, segmentLineTarget), createdAt: nowISO(), updatedAt: nowISO() }));
                        start = end + 1; seg++; if (seg > 12) break;
                    }
                    segmented = true;
                } catch { }
            }
        }
        if (segmented) continue;
        let part = 1; let current = []; let currentBytes = 0;
        const flush = () => { if (!current.length) return; const estLoc = Math.min(180, current.length * 12); const summary = `Fix ESLint rule ${c.rule} (part ${part})`; lines.push(JSON.stringify({ taskId: `LINT-${safeRule}-P${part}`, summary, files: [...current], status: 'pending', estLoc, createdAt: nowISO(), updatedAt: nowISO() })); part++; current = []; currentBytes = 0; };
        for (const it of filteredItems) {
            if (current.length >= maxFilesPerTask) { flush(); if (part > maxTasksPerRule) break; }
            let size = 0; try { size = fs.statSync(it.file).size; } catch { }
            if (currentBytes + size > maxAggregateBytes) { flush(); if (part > maxTasksPerRule) break; }
            if (part > maxTasksPerRule) break;
            current.push(it.file); currentBytes += size;
        }
        flush();
    }
    return lines;
}
function main() { const reportPath = process.argv[2] || 'eslint-report.json'; if (!fs.existsSync(reportPath)) { console.error('Report not found:', reportPath); process.exit(1); } const data = loadReport(reportPath); const clusters = cluster(data); const lines = toQueueLines(clusters, 30); for (const l of lines) process.stdout.write(l + '\n'); }
if (import.meta.url === `file://${process.argv[1]}`) main();
export { cluster, loadReport, recoverFromText, toQueueLines };

