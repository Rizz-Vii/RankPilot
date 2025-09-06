import fs from 'fs';
import path from 'path';

const RESULTS_DIR = path.resolve(process.cwd(), 'test-results');
const REPORT_FILE = path.join(RESULTS_DIR, 'e2e-error-report.md');

function readLines(file: string): string[] {
    try {
        return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    } catch {
        return [];
    }
}

function findArtifacts(): string[] {
    const files: string[] = [];
    function walk(dir: string) {
        let entries: string[] = [];
        try {
            entries = fs.readdirSync(dir).map((f) => path.join(dir, f));
        } catch {
            return;
        }
        for (const entry of entries) {
            let stat: fs.Stats | undefined;
            try { stat = fs.statSync(entry); } catch { continue; }
            if (!stat) continue;
            if (stat.isDirectory()) walk(entry);
            else files.push(entry);
        }
    }
    walk(RESULTS_DIR);
    return files;
}

function readJson<T = any>(file: string): T | null {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch {
        return null;
    }
}

type ErrorEvent = {
    ts?: string;
    message: string; // e.g., 'requestfailed', 'pageerror', 'console.error', 'bad-response', 'form-submit-disabled'
    meta?: {
        url?: string;
        text?: string;
        error?: string;
        status?: number;
        method?: string;
        failure?: { errorText?: string };
        [k: string]: any;
    };
    _raw?: string; // original line
};

function parseEvents(lines: string[]): ErrorEvent[] {
    const out: ErrorEvent[] = [];
    for (const line of lines) {
        try {
            const obj = JSON.parse(line);
            if (!obj || typeof obj !== 'object') continue;
            const ev: ErrorEvent = {
                ts: typeof obj.ts === 'string' ? obj.ts : undefined,
                message: String(obj.message ?? ''),
                meta: obj.meta && typeof obj.meta === 'object' ? obj.meta : undefined,
                _raw: line,
            };
            out.push(ev);
        } catch {
            // allow plain text markers like --- section headers ---
            out.push({ message: 'text', meta: { text: line }, _raw: line });
        }
    }
    return out;
}

function isThirdParty(url?: string): boolean {
    if (!url) return false;
    try {
        const u = new URL(url, 'http://localhost');
        const host = u.host;
        if (!host) return false;
        return !/^(localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?)/.test(host);
    } catch {
        return false;
    }
}

function isNoise(ev: ErrorEvent): boolean {
    const msg = ev.message || '';
    const url = ev.meta?.url || '';
    const text = (ev.meta?.text || ev.meta?.error || ev._raw || '') as string;
    const failureText = ev.meta?.failure?.errorText || '';

    // Generic aborted/cancelled navigations or chunk loads during route switches
    if (/Load request cancelled|NS_BINDING_ABORTED|net::ERR_ABORTED/i.test(failureText)) {
        // Treat third-party aborted requests and Next.js static chunk aborts as noise
        if (isThirdParty(url)) return true;
        if (/\/(_next\/static\/chunks|manifest\.json)/.test(url)) return true;
    }

    // Next.js RSC fallback warning during navigation
    if (/Failed to fetch RSC payload .* Falling back to browser navigation/i.test(text)) return true;

    // CSP report-only style warnings often triggered on login page
    if (/Refused to apply a stylesheet.*style-src directive.*CSP/i.test(text)) return true;

    // Permissions policy noise for payment
    if (/permissions policy.*payment is not allowed/i.test(text)) return true;

    // Firebase/Firestore long-poll channels frequently abort on navigation
    if (/firestore\.googleapis\.com\/google\.firestore/i.test(url) && /ABORTED|cancelled/i.test(failureText)) return true;

    // Google Identity toolkit ping noise
    if (/www\.googleapis\.com\/identitytoolkit\//i.test(url) && /ABORTED|cancelled/i.test(failureText)) return true;

    // Stripe iframes/static noise
    if (/js\.stripe\.com\//i.test(url) && /ABORTED|cancelled/i.test(failureText)) return true;

    // Repeated internal marker for disabled forms (not an error)
    if (msg === 'form-submit-disabled') return true;

    // Text-only section markers
    if (msg === 'text' && /^--- .* ---$/.test(String(ev.meta?.text || ''))) return true;

    return false;
}

function suggestFixesFromSignals(signals: ErrorEvent[]): string[] {
    const hints: string[] = [];
    const hasNetwork = signals.some((e) => /requestfailed|bad-response/.test(e.message));
    const hasClient = signals.some((e) => /pageerror|console\.error/.test(e.message));
    const hasServerDown = signals.some((e) => /ECONNREFUSED|ENOTFOUND|timeout/i.test(e._raw || ''));
    const hasCORS = signals.some((e) => /access control check|CORS/i.test((e.meta?.error || e.meta?.text || e._raw || '') as string));

    if (hasNetwork) hints.push('- Network failures detected: check API routes, auth state, or rate limits.');
    if (hasCORS) hints.push('- CORS error: ensure server allows origin and Authorization header for this route.');
    if (hasClient) hints.push('- Client exceptions: open linked page and inspect stack traces; verify feature flags and env vars.');
    if (hasServerDown) hints.push('- Server not reachable: ensure dev server is running or set TEST_BASE_URL to a deployed URL.');
    if (!hints.length) hints.push('- Review screenshots, HTML snapshots, and traces for UI state at failure.');
    return hints;
}

function main() {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const artifacts = findArtifacts();
    const errorLog = path.join(RESULTS_DIR, 'e2e-errors.log');
    const lines = readLines(errorLog);
    const events = parseEvents(lines);
    const noise: ErrorEvent[] = [];
    const signals: ErrorEvent[] = [];
    for (const ev of events) {
        if (isNoise(ev)) noise.push(ev); else signals.push(ev);
    }
    const fixes = suggestFixesFromSignals(signals);

    // Try to include basic test summary from Playwright JSON reporter, if present
    const jsonReport = path.join(RESULTS_DIR, 'e2e-results.json');
    const report = readJson<any>(jsonReport);
    let summaryLine = '';
    try {
        if (report) {
            const suites = report.suites || [];
            let total = 0, passed = 0, failed = 0, skipped = 0, flaky = 0;
            const countSuite = (s: any) => {
                for (const spec of (s.specs || [])) {
                    for (const t of (spec.tests || [])) {
                        total += 1;
                        const outcome = t?.outcome || t?.results?.[0]?.status || 'unknown';
                        if (outcome === 'expected' || outcome === 'passed') passed += 1;
                        else if (outcome === 'skipped') skipped += 1;
                        else if (outcome === 'flaky') flaky += 1;
                        else failed += 1;
                    }
                }
                for (const child of (s.suites || [])) countSuite(child);
            };
            for (const s of suites) countSuite(s);
            if (total > 0) summaryLine = `Summary: ${passed} passed, ${failed} failed, ${skipped} skipped, ${flaky} flaky (total ${total})`;
        }
    } catch {
        // ignore
    }

    const screenshots = artifacts.filter((f) => f.endsWith('.png'));
    const htmls = artifacts.filter((f) => f.endsWith('.html'));
    const consoles = artifacts.filter((f) => f.endsWith('.console.log'));
    const networks = artifacts.filter((f) => f.endsWith('.network.json'));
    const videos = artifacts.filter((f) => f.endsWith('.webm') || f.endsWith('.mp4'));
    const traces = artifacts.filter((f) => f.endsWith('.zip') && /trace/.test(path.basename(f)));

    const md: string[] = [];
    md.push('# E2E Error Report');
    md.push('');
    md.push(`Generated: ${new Date().toISOString()}`);
    md.push('');
    md.push('## Captured error events');
    md.push('');
    if (summaryLine) {
        md.push(summaryLine);
        md.push('');
    }
    // Signal/noise breakdown
    md.push(`Signal events: ${signals.length} | Suppressed noise: ${noise.length}`);
    md.push('');
    if (signals.length) {
        // Provide a compact categorized view
        const byType: Record<string, number> = {};
        const topUrls: Record<string, number> = {};
        for (const ev of signals) {
            byType[ev.message] = (byType[ev.message] || 0) + 1;
            const u = ev.meta?.url;
            if (u) topUrls[u] = (topUrls[u] || 0) + 1;
        }
        md.push('Types: ' + Object.entries(byType).map(([k, v]) => `${k}:${v}`).join(', '));
        const topUrlList = Object.entries(topUrls)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([u, c]) => `- ${u} (${c})`);
        if (topUrlList.length) {
            md.push('Top URLs:');
            md.push(...topUrlList);
        }
        md.push('');
        md.push('Last 100 signal lines:');
        md.push('```');
        const lastSignals = signals.slice(-100).map((e) => e._raw || JSON.stringify(e));
        md.push(lastSignals.join('\n'));
        md.push('```');
    } else if (lines.length) {
        md.push('_No actionable errors after noise filtering. Showing last 20 noise lines for context._');
        md.push('');
        md.push('```');
        const lastNoise = noise.slice(-20).map((e) => e._raw || JSON.stringify(e));
        md.push(lastNoise.join('\n'));
        md.push('```');
    } else {
        md.push('_No error lines recorded._');
    }
    md.push('');
    md.push('## Artifacts');
    md.push('');
    md.push(`- Screenshots: ${screenshots.length}`);
    md.push(`- HTML snapshots: ${htmls.length}`);
    md.push(`- Console logs: ${consoles.length}`);
    md.push(`- Network logs: ${networks.length}`);
    md.push(`- Videos: ${videos.length}`);
    md.push(`- Traces: ${traces.length}`);
    md.push('');
    if (screenshots.length) {
        md.push('### Screenshot files');
        screenshots.slice(-10).forEach((s) => md.push(`- ${path.basename(s)}`));
        md.push('');
    }
    md.push('## Suggested causes or fixes');
    md.push('');
    fixes.forEach((f) => md.push(f));

    fs.writeFileSync(REPORT_FILE, md.join('\n'));
    console.log(`Report written to ${REPORT_FILE}`);
}

main();
