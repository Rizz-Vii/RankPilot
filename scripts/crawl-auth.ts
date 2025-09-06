/**
 * Production crawl + authenticated checks
 * - Crawls key public routes and captures console/network errors + CSP headers
 * - Logs in as enterprise and admin test users and visits protected pages
 * - Writes a structured report to artifacts/crawl-auth-report.json
 */

import type { BrowserContext, ConsoleMessage, Page, Request, Response } from '@playwright/test';
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { UNIFIED_TEST_USERS } from '../testing/config/unified-test-users';

// Load local environment (.env.local preferred)
(() => {
    const cwd = process.cwd();
    const local = path.resolve(cwd, '.env.local');
    const env = path.resolve(cwd, '.env');
    if (fs.existsSync(local)) dotenv.config({ path: local });
    else if (fs.existsSync(env)) dotenv.config({ path: env });
})();

type RouteResult = {
    url: string;
    status?: number;
    csp?: string | null;
    consoleErrors: string[];
    consoleWarnings: string[];
    requestFailures: Array<{ url: string; method: string; error: string; status?: number }>;
};

type AuthSessionResult = {
    user: 'enterprise' | 'admin';
    loginUrl: string;
    finalUrl?: string;
    success: boolean;
    error?: string;
    pagesVisited: RouteResult[];
};

type Report = {
    target: string;
    startedAt: string;
    finishedAt?: string;
    publicRoutes: RouteResult[];
    authSessions: AuthSessionResult[];
};

const TARGET = process.env.TARGET_URL || process.env.TEST_BASE_URL || 'https://rankpilot-h3jpc.web.app';
const OUT_PATH = path.resolve(process.cwd(), 'artifacts', 'crawl-auth-report.json');

const PUBLIC_PATHS = [
    '/',
    '/pricing',
    '/features',
    '/docs',
    '/about',
    '/contact',
];

const AUTH_PROTECTED_PATHS = [
    '/dashboard',
    '/settings',
    '/billing',
    // '/reports', // removed: route no longer exists, causes persistent 404 noise
    '/adminonly', // will 403/redirect for non-admin (or render forbidden UI)
    '/neuroseo',
];

function errorMessage(err: unknown): string {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
        const maybe = err as { message?: unknown };
        if (typeof maybe.message === 'string') return maybe.message;
        try { return JSON.stringify(err); } catch { /* ignore */ }
    }
    return String(err);
}

function shouldCapture(msg: ConsoleMessage): { type: 'error' | 'warning' | null; text?: string } {
    const text = msg.text();
    const type = msg.type();
    const lower = text.toLowerCase();
    // Target explicit error signals while avoiding generic info logs (e.g., "Firebase app initialized")
    const cspHit = /content security policy|refused to.*inline|unsafe-inline/.test(lower);
    const connClosed = lower.includes('connection closed') || lower.includes('net::err_http2');
    const resourceFail = lower.includes('failed to load resource');
    const firebaseFail = lower.includes('firebaseerror') || lower.includes('auth/') || lower.includes('network-request-failed') || lower.includes('permission-denied');
    if (type === 'error' || connClosed || cspHit || resourceFail || firebaseFail) return { type: 'error', text };
    if (type === 'warning' && (cspHit || lower.includes('deprecated') || lower.includes('blocked'))) return { type: 'warning', text };
    return { type: null };
}

type BrowserLikeContext = {
    newContext?: () => Promise<BrowserContext>;
    newPage: () => Promise<Page>;
};

async function visit(browserContext: BrowserLikeContext, url: string) {
    console.log(`→ Visiting: ${url}`);
    const context = browserContext.newContext ? await browserContext.newContext() : browserContext;
    const page = await (context as { newPage: () => Promise<Page> }).newPage();
    const result: RouteResult = { url, consoleErrors: [], consoleWarnings: [], requestFailures: [] };

    const failures: RouteResult['requestFailures'] = [];
    const onConsole = (msg: ConsoleMessage) => {
        const cap = shouldCapture(msg);
        if (cap.type === 'error' && cap.text) result.consoleErrors.push(cap.text);
        if (cap.type === 'warning' && cap.text) result.consoleWarnings.push(cap.text);
    };
    const onFailed = (req: Request) => {
        // In Playwright >=1.54, req.response() is async; for failed requests there is no response anyway.
        failures.push({ url: req.url(), method: req.method(), error: req.failure()?.errorText || 'unknown', status: undefined });
    };
    const onResponse = async (res: Response) => {
        try {
            const status = res.status();
            if (status >= 400) {
                const req = res.request();
                failures.push({
                    url: res.url() || 'unknown',
                    method: req?.method?.() || 'GET',
                    error: `HTTP ${status}`,
                    status,
                });
            }
        } catch {
            // noop
        }
    };

    page.on('console', onConsole);
    page.on('requestfailed', onFailed);
    page.on('response', onResponse);

    // simple retry loop for transient 5xx errors and navigation flakiness
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`   • Attempt ${attempt}/${maxAttempts} navigate: ${url}`);
            const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            result.status = response?.status();
            const csp = response?.headers()['content-security-policy'];
            result.csp = csp || null;
            // settle a bit for streaming-related console messages
            await page.waitForTimeout(1000);
            // if 5xx, retry
            if ((result.status ?? 0) >= 500 && attempt < maxAttempts) {
                console.warn(`   • HTTP ${result.status} on ${url} – retrying...`);
                await page.waitForTimeout(750);
                continue;
            }
            break; // success or non-retriable
        } catch (e) {
            const em = errorMessage(e);
            console.error(`   • Navigation error on ${url}: ${em}`);
            result.consoleErrors.push(`Navigation error: ${em}`);
            if (attempt < maxAttempts) {
                await page.waitForTimeout(750);
                continue;
            }
        } finally {
            // noop per-attempt
        }
    }

    try {
        result.requestFailures = failures;
        const errCount = result.consoleErrors.length;
        const warnCount = result.consoleWarnings.length;
        const failCount = result.requestFailures.length;
        const statusTxt = result.status ? `HTTP ${result.status}` : 'no status';
        console.log(`   • Done: ${url} – ${statusTxt}; CSP: ${result.csp ? 'present' : 'absent'}; errors=${errCount}, warnings=${warnCount}, failedRequests=${failCount}`);
        await page.close().catch(() => { });
    } catch { /* ignore */ }

    return result;
}

async function loginAndCheck(browser: Awaited<ReturnType<typeof chromium.launch>>) {
    const results: AuthSessionResult[] = [];
    for (const user of ['enterprise', 'admin'] as const) {
        console.log(`
🔐 Starting auth session for: ${user}`);
        const creds = UNIFIED_TEST_USERS[user];
        // Ensure all requests carry probe header if provided (bypass rate limiter)
        const probeHdr = (process.env.CRAWL_PROBE_TOKEN || '').trim();
        const context = await browser.newContext({
            ...(probeHdr ? { extraHTTPHeaders: { 'x-probe-token': probeHdr } } : {}),
        });
        try {
            const originHost = new URL(TARGET).hostname;
            await context.addCookies([{ name: 'rp_appcheck_debug', value: '1', domain: originHost, path: '/', httpOnly: false, secure: true, sameSite: 'Lax' }]);
        } catch { /* ignore */ }
        const page = await context.newPage();
        const session: AuthSessionResult = { user, loginUrl: `${TARGET}/login`, success: false, pagesVisited: [] };
        const routeResults: RouteResult[] = [];

        // capture console/network during session
        const sessionErrors: string[] = [];
        const sessionWarnings: string[] = [];
        page.on('console', (msg) => {
            const cap = shouldCapture(msg);
            if (cap.type === 'error' && cap.text) sessionErrors.push(cap.text);
            if (cap.type === 'warning' && cap.text) sessionWarnings.push(cap.text);
        });

        try {
            console.log(`→ Open login: ${session.loginUrl}`);
            const navResponse = await page.goto(session.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const status = navResponse?.status();
            if (status && status >= 400) {
                throw new Error(`Login page HTTP ${status}`);
            }

            // If we're already authenticated (redirected immediately), treat as success
            const currentPath = new URL(page.url()).pathname;
            if (/\/(dashboard|adminonly|app)(\/.*)?$/.test(currentPath)) {
                session.finalUrl = page.url();
                session.success = true;
                console.log(`   • Already authenticated; redirected to ${session.finalUrl}`);
            }

            // Give the auth context time to resolve and render the form
            try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { /* ignore */ }
            await page.waitForTimeout(500);

            // Be resilient to markup variance: try several selectors for email/password fields
            const emailSelectors = ['#email', 'input[name="email"]', 'input[type="email"]'];
            const passwordSelectors = ['#password', 'input[name="password"]', 'input[type="password"]'];

            let emailSel: string | null = null;
            for (const sel of emailSelectors) {
                try {
                    await page.waitForSelector(sel, { timeout: 25000, state: 'visible' });
                    emailSel = sel; break;
                } catch { }
            }
            if (!emailSel && !session.success) throw new Error('Email field not found');

            let passSel: string | null = null;
            for (const sel of passwordSelectors) {
                try {
                    await page.waitForSelector(sel, { timeout: 25000, state: 'visible' });
                    passSel = sel; break;
                } catch { }
            }
            if (!passSel && !session.success) throw new Error('Password field not found');

            if (!session.success && emailSel && passSel) {
                console.log(`   • Filling credentials for ${user}`);
                await page.fill(emailSel, creds.email);
                await page.fill(passSel, creds.password);
                // Prefer Enter submit to avoid overlay interception
                await page.press(passSel, 'Enter');
                // Wait for redirect (dashboard/adminonly)
                await page.waitForURL(/\/(dashboard|adminonly|app)(\/.*)?$/, { timeout: 45000 }).catch(() => { });
                session.finalUrl = page.url();
                session.success = /\/(dashboard|adminonly|app)/.test(new URL(session.finalUrl).pathname);
                console.log(`   • Post-login URL: ${session.finalUrl} | success=${session.success}`);
            }
            // Visit protected pages
            for (const p of AUTH_PROTECTED_PATHS) {
                const full = `${TARGET}${p}`;
                console.log(`→ Auth visit (${user}): ${full}`);
                const rr = await visit(context as unknown as BrowserLikeContext, full);
                // merge high-level session errors/warnings into each page for visibility
                rr.consoleErrors = [...sessionErrors, ...rr.consoleErrors];
                rr.consoleWarnings = [...sessionWarnings, ...rr.consoleWarnings];
                routeResults.push(rr);
            }
        } catch (e) {
            session.error = errorMessage(e);
            console.error(`   • Auth flow error for ${user}: ${session.error}`);
        } finally {
            session.pagesVisited = routeResults;
            await context.close().catch(() => { });
            results.push(session);
            const totalErrors = routeResults.reduce((n, r) => n + r.consoleErrors.length, 0);
            const totalWarns = routeResults.reduce((n, r) => n + r.consoleWarnings.length, 0);
            console.log(`✅ Finished ${user} session – success=${session.success}; pages=${routeResults.length}; errors=${totalErrors}; warnings=${totalWarns}`);
        }
    }
    return results;
}

async function main() {
    console.log(`\n🧭 Starting production crawl against: ${TARGET}`);
    const report: Report = { target: TARGET, startedAt: new Date().toISOString(), publicRoutes: [], authSessions: [] };
    const browser = await chromium.launch({ headless: true });
    try {
        // Public crawl
        console.log(`\n🌐 Public routes (${PUBLIC_PATHS.length})`);
        for (const p of PUBLIC_PATHS) {
            const url = `${TARGET}${p}`;
            // Ensure public route contexts also carry probe header if provided
            const probeHdr = (process.env.CRAWL_PROBE_TOKEN || '').trim();
            const context = await browser.newContext({
                ...(probeHdr ? { extraHTTPHeaders: { 'x-probe-token': probeHdr } } : {}),
            });
            // Reduce App Check noise during headless browsing
            try {
                const originHost = new URL(TARGET).hostname;
                await context.addCookies([{ name: 'rp_appcheck_debug', value: '1', domain: originHost, path: '/', httpOnly: false, secure: true, sameSite: 'Lax' }]);
            } catch { /* ignore */ }
            const rr = await visit(context as unknown as BrowserLikeContext, url);
            await context.close().catch(() => { });
            report.publicRoutes.push(rr);
        }

        // Authenticated checks
        console.log(`\n👤 Authenticated sessions (enterprise, admin)`);
        report.authSessions = await loginAndCheck(browser);
    } finally {
        await browser.close().catch(() => { });
        report.finishedAt = new Date().toISOString();
    }

    // Write report
    const outDir = path.dirname(OUT_PATH);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
    const totalPublicErrors = report.publicRoutes.reduce((n, r) => n + r.consoleErrors.length, 0);
    const totalPublicWarns = report.publicRoutes.reduce((n, r) => n + r.consoleWarnings.length, 0);
    console.log(`\n📄 Wrote crawl/auth report to ${OUT_PATH}`);
    console.log(`   • Public routes: ${report.publicRoutes.length} | errors=${totalPublicErrors} | warnings=${totalPublicWarns}`);
    const sessSummary = report.authSessions.map(s => `${s.user}: ${s.success ? 'ok' : 'fail'}`).join(', ');
    console.log(`   • Sessions: ${sessSummary}`);
}

// Run if executed directly
if (require.main === module) {
    main().catch((e) => {
        console.error('Crawler failed:', e);
        process.exit(1);
    });
}
