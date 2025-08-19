#!/usr/bin/env ts-node
import fs from 'fs';

// Simple ESLint report clusterer. Input: JSON lines or single JSON array from eslint --format json.
// Output: queue template lines to stdout.

interface LintMessage { ruleId?: string; message: string; line: number; endLine?: number; severity: number }
interface LintFile { filePath: string; messages: LintMessage[] }

function loadReport(p: string): LintFile[] {
    const txt = fs.readFileSync(p, 'utf8');
    try {
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed) && parsed.length) return parsed as LintFile[];
    } catch {
        // fall through to regex mode
    }
    // Fallback: the report may be a truncated / concatenated blob; recover filePath + ruleId pairs via regex.
    return recoverFromText(txt);
}

// Recover lint file/message structure from malformed ESLint JSON output (best‑effort).
function recoverFromText(txt: string): LintFile[] {
    // Strategy: find all filePath occurrences, slice until next filePath token, extract ruleId entries within block.
    const fileRegex = /"filePath":"([^"]+)"/g;
    const indices: { filePath: string; start: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = fileRegex.exec(txt))) {
        indices.push({ filePath: m[1], start: m.index });
    }
    if (!indices.length) return [];
    const files: LintFile[] = [];
    for (let i = 0; i < indices.length; i++) {
        const { filePath, start } = indices[i];
        const end = i + 1 < indices.length ? indices[i + 1].start : txt.length;
        const segment = txt.slice(start, end);
        // Extract each ruleId occurrence inside the segment.
        const ruleMatches = segment.match(/"ruleId":"(.*?)"/g) || [];
        const messages: LintMessage[] = ruleMatches.map(r => {
            const id = /"ruleId":"(.*?)"/.exec(r)?.[1];
            return { ruleId: id, message: '', line: 0, severity: 0 };
        });
        if (messages.length) files.push({ filePath, messages });
    }
    return files;
}

function cluster(files: LintFile[]) {
    const buckets: Record<string, { rule: string; items: { file: string; count: number }[]; total: number }> = {}
    for (const f of files) {
        const ruleCounts: Record<string, number> = {}
        for (const m of f.messages) {
            if (!m.ruleId) continue
            ruleCounts[m.ruleId] = (ruleCounts[m.ruleId] || 0) + 1
        }
        for (const [rule, count] of Object.entries(ruleCounts)) {
            const key = rule
            if (!buckets[key]) buckets[key] = { rule, items: [], total: 0 }
            buckets[key].items.push({ file: f.filePath, count })
            buckets[key].total += count
        }
    }
    return Object.values(buckets).sort((a, b) => b.total - a.total)
}

interface QueueTaskShape { taskId: string; summary: string; files: string[]; status: 'pending'; estLoc: number; createdAt: string; updatedAt: string }

function toQueueLines(clusters: ReturnType<typeof cluster>, limit = 10) {
    const maxTasksPerRule = 4; // safety cap (non‑segmented)
    const maxAggregateBytes = parseInt(process.env.CLUSTER_MAX_AGG || '38000', 10); // stay below validator 40KB
    const maxFilesPerTask = 15;
    const segmentLineTarget = parseInt(process.env.CLUSTER_SEGMENT_LINES || '900', 10); // virtual line-range window
    const largeFileByteThreshold = parseInt(process.env.CLUSTER_LARGE_FILE_BYTES || '80000', 10); // mirrors validator hard limit
    const exclusions = (process.env.CLUSTER_EXCLUDE_PATTERNS || 'functions/src/lib/finance,firestore.rules').split(',').map(s => s.trim()).filter(Boolean);
    const lines: string[] = [];
    const nowISO = () => new Date().toISOString();
    for (const c of clusters.slice(0, limit)) {
        const safeRule = c.rule.replace(/\//g, '_');
        const filteredItems = c.items.filter(it => !exclusions.some(ex => ex && it.file.includes(ex)));
        // If a single gigantic file dominates this rule, emit segmented tasks instead of multi-file parts.
        // Heuristic: top file count > 0 and either (a) only one file OR (b) largest file > largeFileByteThreshold.
        let segmented = false;
        if (filteredItems.length) {
            // Determine largest file path
            let largestFile = filteredItems[0].file;
            let largestSize = 0;
            try { largestSize = fs.statSync(largestFile).size; } catch { largestSize = 0; }
            for (const it of filteredItems.slice(1)) {
                try {
                    const s = fs.statSync(it.file).size;
                    if (s > largestSize) { largestSize = s; largestFile = it.file; }
                } catch { /* ignore */ }
            }
            if (filteredItems.length === 1 || largestSize >= largeFileByteThreshold) {
                try {
                    const text = fs.readFileSync(largestFile, 'utf8');
                    const totalLines = text.split(/\n/).length;
                    let start = 1; let seg = 1;
                    while (start <= totalLines) {
                        const end = Math.min(totalLines, start + segmentLineTarget - 1);
                        const summary = `Fix ESLint rule ${c.rule} (lines ${start}-${end}) segment ${seg}`;
                        const task: QueueTaskShape = {
                            taskId: `LINT-${safeRule}-S${seg}`,
                            summary,
                            files: [largestFile],
                            status: 'pending',
                            estLoc: Math.min(180, segmentLineTarget),
                            createdAt: nowISO(),
                            updatedAt: nowISO()
                        };
                        lines.push(JSON.stringify(task));
                        start = end + 1;
                        seg++;
                        // Hard safety cap: don't enqueue absurd number of segments in one pass.
                        if (seg > 12) break;
                    }
                    segmented = true;
                } catch {
                    // fall back to normal batching if read fails
                }
            }
        }
        if (segmented) continue; // skip normal partition logic when segmented

        let part = 1;
        let current: string[] = [];
        let currentBytes = 0;
        const flush = () => {
            if (!current.length) return;
            const estLoc = Math.min(180, current.length * 12);
            const summary = `Fix ESLint rule ${c.rule} (part ${part})`;
            const task: QueueTaskShape = {
                taskId: `LINT-${safeRule}-P${part}`,
                summary,
                files: current.slice(0),
                status: 'pending',
                estLoc,
                createdAt: nowISO(),
                updatedAt: nowISO()
            };
            lines.push(JSON.stringify(task));
            part++;
            current = [];
            currentBytes = 0;
        };
        for (const it of filteredItems) {
            if (current.length >= maxFilesPerTask) {
                flush();
                if (part > maxTasksPerRule) break;
            }
            let size = 0;
            try { size = fs.statSync(it.file).size; } catch { size = 0; }
            if (currentBytes + size > maxAggregateBytes) {
                flush();
                if (part > maxTasksPerRule) break;
            }
            if (part > maxTasksPerRule) break;
            current.push(it.file);
            currentBytes += size;
        }
        flush();
    }
    return lines;
}

function main() {
    const reportPath = process.argv[2] || 'eslint-report.json'
    if (!fs.existsSync(reportPath)) {
        console.error('Report not found:', reportPath)
        process.exit(1)
    }
    const data = loadReport(reportPath)
    const clusters = cluster(data)
    const lines = toQueueLines(clusters, 30)
    if (!lines.length) {
        console.error('No clusters produced (report may be empty or unparsable).')
    }
    for (const l of lines) process.stdout.write(l + '\n')
}

export { cluster, loadReport, recoverFromText, toQueueLines };
if (require.main === module) main()
