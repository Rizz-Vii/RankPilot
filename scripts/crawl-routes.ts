/**
 * Route crawler
 * - Parses a Next.js build route list text file (like the one pasted in the prompt)
 * - Iteratively visits page routes in a headless browser and probes API routes via HTTP
 * - Captures HTTP status, console errors/warnings, and failed network requests
 * - Writes a structured report to artifacts/route-crawl-report.json
 */

import { chromium, type BrowserContext, type ConsoleMessage, type Request, type Response } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load local env early (prefer .env.local, fallback to .env)
(() => {
  const cwd = process.cwd();
  const local = path.resolve(cwd, '.env.local');
  const env = path.resolve(cwd, '.env');
  if (fs.existsSync(local)) dotenv.config({ path: local });
  else if (fs.existsSync(env)) dotenv.config({ path: env });
})();

// Optional import for login fallback using repo test users
let UNIFIED_TEST_USERS: Record<string, { email: string; password: string }> | undefined;
try {
  UNIFIED_TEST_USERS = require('../testing/config/unified-test-users').UNIFIED_TEST_USERS;
} catch {
  // ignore if not available
}

type RouteResult = {
  path: string;
  kind: 'page' | 'api';
  url: string;
  status?: number;
  method?: 'GET' | 'POST';
  csp?: string | null;
  consoleErrors?: string[];
  consoleWarnings?: string[];
  requestFailures?: Array<{ url: string; method: string; error: string; status?: number }>; // for page kind
  note?: string; // e.g., "skipped", "timeout", etc.
  authRequired?: boolean; // true when we detect 401 Unauthorized
  corsPreflight?: {
    method: 'GET' | 'POST';
    status?: number;
    allowOrigin?: string;
    allowMethods?: string;
    allowHeaders?: string;
  };
};

type Report = {
  target: string;
  startedAt: string;
  finishedAt?: string;
  total: number;
  pages: RouteResult[];
  apis: RouteResult[];
};

const TARGET = process.env.TARGET_URL || process.env.TEST_BASE_URL || 'https://rankpilot-h3jpc.web.app';
const ROUTES_FILE = process.env.ROUTES_FILE || path.resolve(process.cwd(), 'artifacts', 'next-routes.txt');
const OUT_PATH = path.resolve(process.cwd(), 'artifacts', 'route-crawl-report.json');
// Optional Bearer token for authenticated API probing. Supported envs (first non-empty wins):
//  - API_BEARER, CRAWL_BEARER, BEARER_TOKEN
const BEARER = (process.env.API_BEARER || process.env.CRAWL_BEARER || process.env.BEARER_TOKEN || '').trim();
// Throttling knobs (avoid 429s when probe token isn't set in prod)
const PROBE_TOKEN = (process.env.CRAWL_PROBE_TOKEN || '').trim();
const BASE_API_DELAY_MS = Number(process.env.CRAWL_API_DELAY_MS || (PROBE_TOKEN ? 50 : 250));
const PAGE_DELAY_MS = Number(process.env.CRAWL_PAGE_DELAY_MS || 150);

function parseRoutesFromText(text: string): { pages: string[]; apis: string[] } {
  const pages = new Set<string>();
  const apis = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // Extract the first token that looks like a path starting with '/'
    const m = line.match(/\s(\/[^\s]+)/);
    if (!m) continue;
    const p = m[1].trim();
    if (!p.startsWith('/')) continue;
    if (p.includes('[') && p.includes(']')) {
      // Parametrized route template – skip as it cannot be directly visited
      continue;
    }
    if (p.startsWith('/api/')) apis.add(p);
    else pages.add(p);
  }
  return { pages: Array.from(pages), apis: Array.from(apis) };
}

function shouldCapture(msg: ConsoleMessage): { type: 'error' | 'warning' | null; text?: string } {
  const text = msg.text();
  const type = msg.type();
  const lower = text.toLowerCase();
  const cspHit = /content security policy|refused to.*inline|unsafe-inline/.test(lower);
  const connClosed = lower.includes('connection closed') || lower.includes('net::err_http2');
  const resourceFail = lower.includes('failed to load resource');
  const firebaseFail = lower.includes('firebaseerror') || lower.includes('auth/') || lower.includes('network-request-failed') || lower.includes('permission-denied');
  if (type === 'error' || connClosed || cspHit || resourceFail || firebaseFail) return { type: 'error', text };
  if (type === 'warning' && (cspHit || lower.includes('deprecated') || lower.includes('blocked'))) return { type: 'warning', text };
  return { type: null };
}

function errorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const maybe = err as { message?: unknown };
    if (typeof maybe.message === 'string') return maybe.message;
    try { return JSON.stringify(err); } catch { /* ignore */ }
  }
  return String(err);
}

async function visitPage(context: BrowserContext, url: string, pathLabel: string): Promise<RouteResult> {
  const page = await context.newPage();
  const result: RouteResult = { path: pathLabel, kind: 'page', url, consoleErrors: [], consoleWarnings: [], requestFailures: [] };

  const failures: NonNullable<RouteResult['requestFailures']> = [];
  page.on('console', (msg: ConsoleMessage) => {
    const cap = shouldCapture(msg);
    if (cap.type === 'error' && cap.text) result.consoleErrors!.push(cap.text);
    if (cap.type === 'warning' && cap.text) result.consoleWarnings!.push(cap.text);
  });
  page.on('requestfailed', (req: Request) => {
    const url = req.url();
    const err = req.failure()?.errorText || 'unknown';
    // Ignore benign aborted prefetch/navigation races that Next.js emits during RSC redirects
    // Heuristic: aborted GET to same-origin _rsc or login redirect prefetch
    const isSameOrigin = url.startsWith(new URL(TARGET).origin);
    const isRSC = /[_?]rsc=/.test(url);
    const isAborted = /aborted/i.test(err);
    if (req.method() === 'GET' && isSameOrigin && isAborted && isRSC) return;
    failures.push({ url, method: req.method(), error: err, status: undefined });
  });
  page.on('response', async (res: Response) => {
    try {
      const status = res.status();
      if (status >= 400) {
        const req = res.request();
        failures.push({ url: res.url() || 'unknown', method: req?.method?.() || 'GET', error: `HTTP ${status}`, status });
      }
    } catch { /* ignore */ }
  });

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      result.status = response?.status();
      const csp = response?.headers()['content-security-policy'];
      result.csp = csp || null;
      await page.waitForTimeout(1000);
      if ((result.status ?? 0) >= 500 && attempt < maxAttempts) {
        await page.waitForTimeout(750);
        continue;
      }
      break;
    } catch (e) {
      const em = errorMessage(e);
      result.consoleErrors!.push(`Navigation error: ${em}`);
      if (attempt < maxAttempts) {
        await page.waitForTimeout(750);
        continue;
      }
    }
  }

  result.requestFailures = failures;
  await page.close().catch(() => { });
  return result;
}

async function maybeLogin(context: BrowserContext, baseUrl: string): Promise<boolean> {
  // Enable via env: CRAWL_LOGIN=1; choose user via CRAWL_LOGIN_ROLE=enterprise|admin or CRAWL_LOGIN_EMAIL/PASSWORD
  if ((process.env.CRAWL_LOGIN || '').trim() !== '1') return false;
  const page = await context.newPage();
  const loginUrl = `${baseUrl}/login`;
  try {
    const role = (process.env.CRAWL_LOGIN_ROLE || 'enterprise') as 'enterprise' | 'admin';
    const email = process.env.CRAWL_LOGIN_EMAIL || UNIFIED_TEST_USERS?.[role]?.email;
    const password = process.env.CRAWL_LOGIN_PASSWORD || UNIFIED_TEST_USERS?.[role]?.password;
    if (!email || !password) return false;
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { }
    const emailSelectors = ['#email', 'input[name="email"]', 'input[type="email"]'];
    const passwordSelectors = ['#password', 'input[name="password"]', 'input[type="password"]'];
    let emailSel: string | null = null;
    for (const sel of emailSelectors) { try { await page.waitForSelector(sel, { timeout: 8000, state: 'visible' }); emailSel = sel; break; } catch { } }
    let passSel: string | null = null;
    for (const sel of passwordSelectors) { try { await page.waitForSelector(sel, { timeout: 8000, state: 'visible' }); passSel = sel; break; } catch { } }
    if (!emailSel || !passSel) return false;
    await page.fill(emailSel, email);
    await page.fill(passSel, password);
    await page.press(passSel, 'Enter');
    await page.waitForURL(/\/(dashboard|adminonly|app)(\/.*)?$/, { timeout: 30000 }).catch(() => { });
    const ok = /\/(dashboard|adminonly|app)/.test(new URL(page.url()).pathname);
    await page.close().catch(() => { });
    return ok;
  } catch {
    try { await page.close(); } catch { }
    return false;
  }
}

const POST_ONLY = new Set<string>([
  '/api/automation/run-now',
  '/api/automation/run-due',
  '/api/chat/admin/stream',
  '/api/chat/customer/stream',
  '/api/neuroseo/stream',
  '/api/stripe/webhook',
  '/api/stripe-webhook',
  '/api/webhooks/stripe',
  '/api/push-notifications/subscribe',
]);
// Some streaming routes are GET-only (SSE)
const GET_STREAM_PATHS = new Set<string>([
  '/api/insights/stream',
]);
const SKIP_ENDPOINTS = new Set<string>([
  '/api/stripe/webhook',
  '/api/stripe-webhook',
  '/api/webhooks/stripe',
]);

async function probeApi(context: BrowserContext, url: string, pathLabel: string): Promise<RouteResult> {
  // Build headers for API probe
  const headers: Record<string, string> = { Accept: '*/*' };
  const isStream = /\/stream(\/|$)/.test(pathLabel);
  if (isStream) headers['Accept'] = 'text/event-stream'; // keep SSE header
  if (BEARER) headers['Authorization'] = `Bearer ${BEARER}`; // optional auth
  // Include probe token so middleware can exempt automated checks from RL caps
  const PROBE = (process.env.CRAWL_PROBE_TOKEN || '').trim();
  if (PROBE) headers['x-probe-token'] = PROBE;

  const result: RouteResult = { path: pathLabel, kind: 'api', url };

  // Skip known webhook endpoints that require provider signatures
  if (SKIP_ENDPOINTS.has(pathLabel)) {
    result.note = 'skipped:webhook';
    return result;
  }

  // First: attempt a simple GET probe
  try {
    const res = await context.request.get(url, { timeout: 15000, headers });
    result.status = res.status();
    result.method = 'GET';
    if (result.status === 401) result.authRequired = true;
  } catch (e) {
    result.note = `request error: ${errorMessage(e)}`;
  }

  // If 405 (method not allowed) or known POST-only path, try POST with empty JSON/body
  // Guard: do not clobber a successful GET (2xx) by probing POST afterwards
  if ((result.status === 405 || POST_ONLY.has(pathLabel)) && !(result.status && result.status >= 200 && result.status < 300)) {
    try {
      const res2 = await context.request.post(url, { timeout: 15000, headers: { ...headers, 'Content-Type': 'application/json' }, data: {} });
      result.status = res2.status();
      result.method = 'POST';
      if (result.status === 401) result.authRequired = true;
    } catch (e) {
      // annotate but don't clobber previous note if exists
      if (!result.note) result.note = `post probe error: ${errorMessage(e)}`;
    }
  }

  // Second: perform a CORS preflight OPTIONS probe (approximation)
  // Heuristic: treat "/stream" routes as POST except for explicitly GET-only streams
  const preflightMethod: 'GET' | 'POST' = GET_STREAM_PATHS.has(pathLabel) ? 'GET' : (isStream ? 'POST' : 'GET');
  const origin = new URL(TARGET).origin;
  try {
    const pf = await context.request.fetch(url, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': preflightMethod,
        'Access-Control-Request-Headers': BEARER ? 'authorization, content-type' : 'content-type',
      },
      timeout: 10000,
    });
    const h = pf.headers();
    result.corsPreflight = {
      method: preflightMethod,
      status: pf.status(),
      allowOrigin: h['access-control-allow-origin'],
      allowMethods: h['access-control-allow-methods'],
      allowHeaders: h['access-control-allow-headers'],
    };
  } catch (e) {
    // Only annotate the note if not already set
    if (!result.note) result.note = `preflight error: ${errorMessage(e)}`;
  }

  return result;
}

async function main() {
  if (!fs.existsSync(ROUTES_FILE)) {
    console.error(`Routes file not found: ${ROUTES_FILE}`);
    process.exit(2);
  }
  const raw = fs.readFileSync(ROUTES_FILE, 'utf8');
  const { pages, apis } = parseRoutesFromText(raw);
  console.log(`Parsed routes – pages=${pages.length}, apis=${apis.length}`);

  const report: Report = { target: TARGET, startedAt: new Date().toISOString(), total: pages.length + apis.length, pages: [], apis: [] };
  const browser = await chromium.launch({ headless: true });
  const probeHdr = (process.env.CRAWL_PROBE_TOKEN || '').trim();
  const context = await browser.newContext({
    ...(probeHdr ? { extraHTTPHeaders: { 'x-probe-token': probeHdr } } : {}),
  });
  try {
    // Enable Firebase App Check debug mode for headless crawls to avoid ReCAPTCHA noise
    const origin = new URL(TARGET).origin;
    await context.addCookies([
      { name: 'rp_appcheck_debug', value: '1', domain: new URL(origin).hostname, path: '/', httpOnly: false, secure: true, sameSite: 'Lax' },
    ]);

    // Optional: perform login once to reduce 401/403 noise on protected pages
    const didLogin = await maybeLogin(context, TARGET);
    if (didLogin) {
      console.log('Authenticated session established for crawl.');
    }
  } catch { /* ignore cookie issues */ }
  try {
    for (const p of pages) {
      const url = `${TARGET}${p}`;
      console.log(`→ Page: ${url}`);
      const rr = await visitPage(context, url, p);
      report.pages.push(rr);
      await new Promise(r => setTimeout(r, PAGE_DELAY_MS));
    }
    for (const a of apis) {
      const url = `${TARGET}${a}`;
      console.log(`→ API: ${url}`);
      const rr = await probeApi(context, url, a);
      report.apis.push(rr);
      await new Promise(r => setTimeout(r, BASE_API_DELAY_MS));
    }
  } finally {
    await context.close().catch(() => { });
    await browser.close().catch(() => { });
    report.finishedAt = new Date().toISOString();
  }

  const outDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  const pageErrors = report.pages.reduce((n, r) => n + (r.consoleErrors?.length || 0), 0);
  const pageFails = report.pages.reduce((n, r) => n + (r.requestFailures?.length || 0), 0);
  const api401 = report.apis.filter(r => r.status === 401).length;
  const api4xx5xx = report.apis.filter(r => (r.status ?? 0) >= 400 && r.status !== 401).length;
  console.log(`\nReport written: ${OUT_PATH}`);
  console.log(`Summary: pages=${report.pages.length} (consoleErrors=${pageErrors}, failedRequests=${pageFails}), apis=${report.apis.length} (401(auth-required)=${api401}, other4xx/5xx=${api4xx5xx})`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Route crawler failed:', e);
    process.exit(1);
  });
}
