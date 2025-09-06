/**
 * Summarize route crawl report into actionable findings
 * - Groups API results by status class
 * - Highlights likely defects vs expected responses
 * - Produces a compact markdown summary file for triage
 */

import fs from 'fs';
import path from 'path';

interface RouteResult {
    path: string;
    kind: 'page' | 'api';
    url: string;
    status?: number;
    method?: 'GET' | 'POST';
    csp?: string | null;
    consoleErrors?: string[];
    consoleWarnings?: string[];
    requestFailures?: Array<{ url: string; method: string; error: string; status?: number }>;
    note?: string;
    authRequired?: boolean;
    corsPreflight?: {
        method: 'GET' | 'POST';
        status?: number;
        allowOrigin?: string;
        allowMethods?: string;
        allowHeaders?: string;
    };
}

interface Report {
    target: string;
    startedAt: string;
    finishedAt?: string;
    total: number;
    pages: RouteResult[];
    apis: RouteResult[];
}

const REPORT_PATH = process.env.REPORT_PATH || path.resolve(process.cwd(), 'artifacts', 'route-crawl-report.json');
const OUT_MD = process.env.OUT_MD || path.resolve(process.cwd(), 'artifacts', 'route-crawl-summary.md');

function classifyApi(r: RouteResult) {
    const s = r.status ?? 0;
    const group = s === 0 ? 'unknown' : s >= 500 ? '5xx' : s >= 400 ? '4xx' : s >= 200 && s < 300 ? '2xx' : 'other';
    return { s, group } as const;
}

function isIgnored(r: RouteResult): boolean {
    // Ignore test endpoints and validation-only 400s
    if (r.path.startsWith('/api/test/')) return true;
    if (r.status === 400) {
        const validationOnly = new Set<string>([
            '/api/admin/ai-usage/daily', // requires start=YYYY-MM-DD
            '/api/automation/run-now',   // requires POST body
            '/api/support/reply',        // requires POST body
            '/api/verify-captcha',       // requires token query
        ]);
        if (validationOnly.has(r.path)) return true;
    }
    return false;
}

function likelyExpected(r: RouteResult): boolean {
    // Mark as expected when:
    // - 401 with authRequired flag
    // - 405 on GET for endpoints that are POST-only (crawler already tries POST)
    // - webhook endpoints skipped
    if (r.note && r.note.startsWith('skipped')) return true;
    if (r.status === 401 && r.authRequired) return true;
    if (r.status === 405) return true;
    // Treat 410 Gone as expected if path looks deprecated/automation run-due
    if (r.status === 410 && /automation\/run-due/.test(r.path)) return true;
    return false;
}

function run() {
    if (!fs.existsSync(REPORT_PATH)) {
        console.error('Report file not found:', REPORT_PATH);
        process.exit(2);
    }
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as Report;
    const lines: string[] = [];
    lines.push(`# Route Crawl Summary`);
    lines.push(`Target: ${report.target}`);
    lines.push(`Window: ${report.startedAt} → ${report.finishedAt || ''}`);
    lines.push('');

    const apis = report.apis;
    const groups = new Map<string, RouteResult[]>();
    for (const a of apis) {
        const { group } = classifyApi(a);
        const arr = groups.get(group) || [];
        arr.push(a);
        groups.set(group, arr);
    }

    const get = (g: string) => groups.get(g) || [];
    const twoxx = get('2xx').length;
    const fourxx = get('4xx').length;
    const fivexx = get('5xx').length;

    lines.push(`APIs: ${apis.length} total → OK: ${twoxx}, 4xx: ${fourxx}, 5xx: ${fivexx}`);

    // Actionable: list 4xx/5xx that are not likely expected
    const actionable = apis.filter(a => (a.status ?? 0) >= 400 && !isIgnored(a) && !likelyExpected(a));
    const prioritized = actionable.sort((a, b) => (b.status ?? 0) - (a.status ?? 0));

    lines.push('');
    lines.push('## Actionable API findings');
    if (!prioritized.length) {
        lines.push('- None.');
    } else {
        for (const r of prioritized) {
            const pf = r.corsPreflight;
            const pfStr = pf ? `; preflight ${pf.status} (${pf.method})` : '';
            lines.push(`- [${r.status}] ${r.method || 'GET'} ${r.path}${pfStr}`);
        }
    }

    // Pages: summarize console errors
    const pageErrs = report.pages
        .map(p => ({ path: p.path, errs: p.consoleErrors?.length || 0 }))
        .filter(p => p.errs > 0)
        .sort((a, b) => b.errs - a.errs)
        .slice(0, 15);
    lines.push('');
    lines.push('## Top pages by console errors (max 15)');
    if (!pageErrs.length) lines.push('- None.');
    else for (const p of pageErrs) lines.push(`- ${p.path}: ${p.errs}`);

    fs.writeFileSync(OUT_MD, lines.join('\n') + '\n');
    console.log('Summary written to:', OUT_MD);
}

run();
