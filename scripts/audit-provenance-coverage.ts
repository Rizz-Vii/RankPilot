#!/usr/bin/env ts-node
/** PROV-01: Provenance Coverage Audit
 * Enumerates API route files and heuristically checks for enforceProvenance / withProvenance usage or explicit __provenance assignment.
 * Fails (exit 1) if any route appears AI-related (contains 'ai'|'neuroseo'|'marketing' patterns) and lacks provenance markers.
 */
import fs from 'fs';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';

const ROOT = path.resolve(process.cwd(), 'src/app/api');
const CONFIG_PATH = path.resolve(process.cwd(), '.provenance-audit.json');
// Narrow hints to reduce false positives on non-AI operational endpoints.
const AI_HINTS = [
    /\/ai\//i,
    /neuroseo\/(?!metrics)/i,
    /automation\//i,
    /competitive/i,
    /conversational-seo/i,
    /multi-model/i,
    /insights\/stream/i,
    /seo-audit\/run/i,
    /\/chat\//i,
    /\/chat\/admin\//i,
    /\/admin\/stream\//i,
];
const PROV_MARKERS = [/enforceProvenance/, /withProvenance/, /__provenance\s*:/];

// Optional exemption list (exact relative file paths) for documented reasons (see PROVENANCE_POLICY.md)
const EXEMPTIONS = new Set<string>([/* intentionally empty; deprecated automation run-due endpoint removed */]);

const STRICT = process.env.PROV_STRICT === '1'; // when enabled, require withProvenance for non-streaming AI routes

// Optional JSON config structure
type RuntimeCheck = { path: string; type: 'json' | 'csv' | 'sse' };
interface AuditConfig {
    extraHints?: string[]; // regex strings
    extraRuntimeUrls?: RuntimeCheck[]; // paths (prefixed with /) relative to origin
    exemptions?: string[]; // relative file paths
}

function loadConfig(): AuditConfig {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
            return JSON.parse(raw) as AuditConfig;
        }
    } catch (e) {
        console.warn('[provenance-audit] Failed to load .provenance-audit.json:', (e as any)?.message);
    }
    return {};
}

const CONFIG = loadConfig();

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
    // Path-based hints + configurable hints
    const extraHints = (CONFIG.extraHints || []).map((s) => {
        try { return new RegExp(s, 'i'); } catch { return null; }
    }).filter(Boolean) as RegExp[];
    const pathHints = [...AI_HINTS, ...extraHints];
    // Content-based hints (providers/keywords)
    const contentHints = /(openai|gemini|anthropic|llm|ai-)/i.test(txt);
    const aiRelated = pathHints.some(r => r.test(f)) || contentHints;
    if (!aiRelated) return;
    const rel = path.relative(process.cwd(), f);
    if (EXEMPTIONS.has(rel) || (CONFIG.exemptions || []).includes(rel)) return;
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
        // Streaming routes should explicitly use enforceProvenanceOnChunk
        if (/\/stream\//.test(f) && !/enforceProvenanceOnChunk/.test(txt)) {
            violations.push({ file: rel, reason: 'Strict mode: streaming endpoint missing enforceProvenanceOnChunk' });
        }
    }
});

function finalize() {
    // Emit machine-readable report
    try {
        const outDir = path.resolve(process.cwd(), 'testing/reports');
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'provenance-audit.json'), JSON.stringify({ count: violations.length, violations }, null, 2));
    } catch { }

    if (violations.length) {
        console.error('Provenance coverage audit FAILED');
        // Compact summary lines
        for (const v of violations) {
            console.error(`PROV: [FAIL] ${v.file} - ${v.reason}`);
            if (process.env.CI) {
                // GitHub Actions annotation format (warning style to surface in logs)
                console.error(`::warning file=${v.file}::Provenance violation: ${v.reason}`);
            }
        }
        console.error(JSON.stringify({ count: violations.length, violations }, null, 2));
        process.exit(1);
    } else {
        console.log('Provenance coverage audit PASS');
    }
}

function parseArgs(argv: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const a of argv) {
        if (a.startsWith('--')) {
            const [k, v] = a.replace(/^--/, '').split('=');
            out[k] = v ?? '1';
        }
    }
    return out;
}

async function fetchWithRetry(url: string, opts: RequestInit & { retries?: number; retryDelayMs?: number } = {}): Promise<Response> {
    const { retries = 1, retryDelayMs = 300, ...rest } = opts;
    let lastErr: any;
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url, rest);
            return res;
        } catch (e) {
            lastErr = e;
            if (i < retries) await sleep(retryDelayMs);
        }
    }
    throw lastErr;
}

async function runTableDataProvenanceChecks(origin: string, timeoutMs: number): Promise<Finding[]> {
    const out: Finding[] = [];
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        // JSON check: __provenance must exist
        const jsonUrl = `${origin}/api/table-data?widgetId=prov-audit&format=json&page=0&pageSize=1`;
        const jsonRes = await fetchWithRetry(jsonUrl, { signal: controller.signal, retries: 1 });
        if (jsonRes.ok) {
            const body = await jsonRes.json();
            if (!('__provenance' in body)) {
                out.push({ file: 'runtime:/api/table-data?format=json', reason: 'Missing __provenance on JSON payload' });
            }
        } else {
            out.push({ file: 'runtime:/api/table-data?format=json', reason: `HTTP ${jsonRes.status} calling table-data` });
        }

        // CSV check: x-provenance header must exist
        const csvUrl = `${origin}/api/table-data?widgetId=prov-audit&format=csv&page=0&pageSize=1`;
        const csvRes = await fetchWithRetry(csvUrl, { signal: controller.signal, retries: 1 });
        if (csvRes.ok) {
            const prov = csvRes.headers.get('x-provenance');
            if (!prov) {
                out.push({ file: 'runtime:/api/table-data?format=csv', reason: 'Missing x-provenance header on CSV response' });
            }
        } else {
            out.push({ file: 'runtime:/api/table-data?format=csv', reason: `HTTP ${csvRes.status} calling table-data` });
        }
    } catch (e: any) {
        const requireServer = process.env.PROV_REQUIRE_SERVER === '1';
        if (requireServer) {
            out.push({ file: 'runtime:/api/table-data', reason: `Server unavailable for runtime provenance audit: ${e?.message || e}` });
        } else {
            console.warn('[provenance-audit] Skipping runtime /api/table-data checks (server not available).');
        }
    } finally {
        clearTimeout(t);
    }
    return out;
}

async function runExtraRuntimeChecks(origin: string, timeoutMs: number): Promise<Finding[]> {
    const out: Finding[] = [];
    const extra = CONFIG.extraRuntimeUrls || [];
    if (!extra.length) return out;
    for (const check of extra) {
        const url = check.path.startsWith('http') ? check.path : `${origin}${check.path}`;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetchWithRetry(url, { signal: controller.signal, retries: 1 });
            if (!res.ok) {
                // If auth is required, skip failing and fallback to static code scan as requested
                if (res.status === 401 || res.status === 403) {
                    console.warn(`[provenance-audit] Skipping ${check.path} (${check.type}) due to auth (${res.status}). Falling back to static scan.`);
                    continue;
                }
                out.push({ file: `runtime:${check.path}`, reason: `HTTP ${res.status} calling ${check.type}` });
                continue;
            }
            if (check.type === 'json') {
                const body = await res.json().catch(() => ({}));
                if (!('__provenance' in body)) out.push({ file: `runtime:${check.path}`, reason: 'Missing __provenance on JSON payload' });
            } else if (check.type === 'csv') {
                const prov = res.headers.get('x-provenance');
                if (!prov) out.push({ file: `runtime:${check.path}`, reason: 'Missing x-provenance header on CSV response' });
            } else if (check.type === 'sse') {
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('text/event-stream')) out.push({ file: `runtime:${check.path}`, reason: 'SSE endpoint missing text/event-stream content-type' });
                // Optional: attempt to read a small portion of the body to ensure stream
                // Note: Node fetch body is a web ReadableStream in modern Node.
                try {
                    const reader = (res.body as any)?.getReader?.();
                    if (reader) {
                        const r = await Promise.race([
                            reader.read(),
                            sleep(500).then(() => ({ done: true, value: undefined }))
                        ]);
                        if (!r || (r as any).done) {
                            out.push({ file: `runtime:${check.path}`, reason: 'SSE stream did not yield initial chunk' });
                        }
                    }
                } catch { }
            }
        } catch (e: any) {
            const requireServer = process.env.PROV_REQUIRE_SERVER === '1';
            if (requireServer) out.push({ file: `runtime:${check.path}`, reason: `Server unavailable: ${e?.message || e}` });
            else console.warn(`[provenance-audit] Skipping runtime ${check.path} (${check.type}) check (server not available).`);
        } finally {
            clearTimeout(t);
        }
    }
    return out;
}

// Run optional runtime checks then finalize
(async () => {
    const args = parseArgs(process.argv.slice(2));
    const origin = args.origin || process.env.PROV_ORIGIN || 'http://localhost:3000';
    const timeoutMs = Number(args.timeoutMs || process.env.PROV_TIMEOUT_MS || 5000);
    const findingsA = await runTableDataProvenanceChecks(origin, timeoutMs);
    const findingsB = await runExtraRuntimeChecks(origin, timeoutMs);
    if (findingsA.length) violations.push(...findingsA);
    if (findingsB.length) violations.push(...findingsB);
    finalize();
})().catch(() => finalize());
