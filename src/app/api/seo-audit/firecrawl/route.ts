import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';
import { runFirecrawl } from '@/lib/crawler/firecrawl-client';
import { recordRouteLatency, recordRateLimitRejection, recordTeamRateLimitAllowed, recordCrawlerQuota, recordCrawlerSuccess, recordCrawlerError } from '@/lib/metrics/unified-metrics';
// Quota persistence (T12) – Firestore-backed with in-memory fallback.
const FIRECRAWL_WINDOW_MS = 60 * 60 * 1000; // 1h
let memWindowStart = Date.now();
let memCount = 0;
let cachedAdminDb: any = null;
export function __resetFirecrawlQuotaTestOnly() {
    memWindowStart = Date.now();
    memCount = 0;
    // Reset cached adminDb store if it has an internal map (test shim scenario)
    if (cachedAdminDb && typeof cachedAdminDb.collection === 'function') {
        // naive attempt: replace with new empty stub if available
        cachedAdminDb = null;
    }
}
async function enforceFirecrawlQuota(limit: number, scopeKey: string) {
    try {
        if (!cachedAdminDb) {
            const mod: any = (global as any).adminDb ? { adminDb: (global as any).adminDb } : await import('@/lib/firebase-admin').catch(() => import('../../../../lib/firebase-admin'));
            cachedAdminDb = mod.adminDb;
        }
        const adminDb: any = cachedAdminDb as any;
        const docRef = adminDb.collection('firecrawlQuota').doc(scopeKey);
        const now = Date.now();
        let retryAfterSeconds = 0;
        const res = await adminDb.runTransaction(async (tx: any) => {
            const snap = await tx.get(docRef);
            let data: any = snap.exists ? (snap.data() as any) : { count: 0, windowStart: (global as any).Timestamp?.fromMillis(now) || new Date(now) };
            const windowStartMs = data?.windowStart?.toMillis ? data.windowStart.toMillis() : (data?.windowStart?.seconds ? data.windowStart.seconds * 1000 : now);
            if (now - windowStartMs >= FIRECRAWL_WINDOW_MS) {
                data.count = 0; data.windowStart = (global as any).Timestamp?.fromMillis(now) || new Date(now);
            }
            if ((data.count || 0) + 1 > limit) {
                retryAfterSeconds = Math.max(1, Math.ceil((FIRECRAWL_WINDOW_MS - (now - windowStartMs)) / 1000));
                return { allowed: false, remaining: 0, resetAt: new Date(windowStartMs + FIRECRAWL_WINDOW_MS), retryAfterSeconds };
            }
            data.count = (data.count || 0) + 1;
            tx.set(docRef, data, { merge: true });
            return { allowed: true, remaining: Math.max(0, limit - data.count), resetAt: new Date(windowStartMs + FIRECRAWL_WINDOW_MS), retryAfterSeconds: 0 };
        });
        return res;
    } catch {
        // Fallback to in-memory (single-instance) if Firestore unavailable
        const now = Date.now();
        if (now - memWindowStart >= FIRECRAWL_WINDOW_MS) { memWindowStart = now; memCount = 0; }
        memCount += 1;
        const allowed = memCount <= limit;
        return { allowed, remaining: allowed ? (limit - memCount) : 0, resetAt: new Date(memWindowStart + FIRECRAWL_WINDOW_MS), retryAfterSeconds: allowed ? 0 : 3600 };
    }
}

// GET /api/seo-audit/firecrawl?url=...&depth=1&limit=5
export const GET = withProvenance(async function GET(req: Request) {
    const nreq = req as NextRequest;
    const started = Date.now();
    try {
        const urlObj = new URL(nreq.url);
        const target = urlObj.searchParams.get('url');
        const depth = Number(urlObj.searchParams.get('depth') || '1');
        const limit = Number(urlObj.searchParams.get('limit') || '5');
        if (!target) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'url_required', provenance: 'synthetic' }, { path: 'seo-audit/firecrawl', note: 'validation' }), { status: 400 });
        }
        let parsedTarget: URL;
        try { parsedTarget = new URL(target); } catch { return NextResponse.json(enforceProvenance({ success: false, error: 'malformed_url', provenance: 'synthetic' }, { path: 'seo-audit/firecrawl', note: 'validation' }), { status: 400 }); }
        const phaseStart = { quota: Date.now(), crawl: 0 };
        // Quota enforcement (env override FIRECRAWL_HOURLY_LIMIT default 100). Scope: global (future: team/user scope keys)
        const quotaLimit = parseInt(process.env.FIRECRAWL_HOURLY_LIMIT || '100', 10) || 100;
        // Derive scope (team preferred > user > global) – expecting optional headers for now
        const teamId = nreq.headers.get('x-team-id') || undefined;
        const userId = nreq.headers.get('x-user-id') || undefined;
        const scopeKey = teamId ? `team:${teamId}` : (userId ? `user:${userId}` : 'global');
        const quota = await enforceFirecrawlQuota(quotaLimit, scopeKey);
        const quotaTimeMs = Date.now() - phaseStart.quota;
        if (!quota.allowed) {
            recordRateLimitRejection('seo-audit/firecrawl');
            return NextResponse.json(
                enforceProvenance({ success: false, error: 'rate_limited', provenance: 'synthetic', quota: { remaining: quota.remaining, resetAt: quota.resetAt.toISOString() } }, { path: 'seo-audit/firecrawl', note: 'rate_limit' }),
                { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds || 60) } }
            );
        }
        recordTeamRateLimitAllowed('seo-audit/firecrawl');
        recordCrawlerQuota(quotaLimit, quota.remaining);
        // robots.txt respect (basic) – fetch only if depth>1
        if (depth > 1) {
            try {
                const robotsUrl = `${parsedTarget.origin}/robots.txt`;
                // Use standard fetch (omit Next.js specific revalidate option for test compatibility)
                const robotsRes = await fetch(robotsUrl);
                if (robotsRes.ok) {
                    const txt = await robotsRes.text();
                    const disallow: string[] = [];
                    let userAgentAll = true; // simplistic: treat all Disallow lines as global
                    txt.split(/\n+/).forEach(line => {
                        const m = line.match(/^Disallow:\s*(\S+)/i);
                        if (m) disallow.push(m[1]);
                    });
                    const path = parsedTarget.pathname || '/';
                    if (userAgentAll && disallow.some(rule => rule === '/' || (rule && rule !== '/' && path.startsWith(rule)))) {
                        return NextResponse.json(enforceProvenance({ success: false, error: 'robots_blocked', provenance: 'synthetic' }, { path: 'seo-audit/firecrawl', note: 'robots' }), { status: 403 });
                    }
                }
            } catch { /* ignore robots failures per degradation policy */ }
        }
        phaseStart.crawl = Date.now();
        const crawl = await runFirecrawl(target, { depth, limit });
        const crawlTimeMs = crawl.elapsedMs;
        const elapsedMs = Date.now() - started; recordRouteLatency('seo-audit/firecrawl', elapsedMs);
        if (crawl.fallback) { recordCrawlerError(crawlTimeMs); } else { recordCrawlerSuccess(crawlTimeMs, 0); }
        const analysisTimeMs = elapsedMs - quotaTimeMs - crawlTimeMs;
        const res = NextResponse.json(enforceProvenance({ success: true, provenance: crawl.fallback ? 'synthetic' : 'live', data: { pages: crawl.pages, fallback: !!crawl.fallback, degradedReason: crawl.degradedReason, timings: { quota_time_ms: quotaTimeMs, crawl_time_ms: crawlTimeMs, analysis_time_ms: analysisTimeMs, total_time_ms: elapsedMs }, quota: { remaining: quota.remaining, resetAt: quota.resetAt.toISOString(), scope: scopeKey } } }, { path: 'seo-audit/firecrawl' }));
        res.headers.set('X-Quota-Remaining', String(quota.remaining));
        res.headers.set('X-Quota-Reset', quota.resetAt.toISOString());
        return res;
    } catch (e: unknown) {
        return NextResponse.json(enforceProvenance({ success: false, error: (e as any)?.message || 'crawl_error', provenance: 'synthetic' }, { path: 'seo-audit/firecrawl', note: 'exception' }), { status: 500 });
    }
}, { path: 'seo-audit/firecrawl' });
