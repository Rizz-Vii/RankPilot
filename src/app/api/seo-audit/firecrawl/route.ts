import { runFirecrawl } from '@/lib/crawler/firecrawl-client';
import { recordCrawlerError, recordCrawlerQuota, recordCrawlerSuccess, recordRateLimitRejection, recordRouteLatency, recordTeamRateLimitAllowed } from '@/lib/metrics/unified-metrics';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { enforceFirecrawlQuota } from './firecrawl-quota';

export const runtime = 'nodejs';
export const maxDuration = 120;

 // GET /api/seo-audit/firecrawl?url=...&depth=1&limit=5
 export const GET = withProvenance(async function GET(req: NextRequest) {
     const started = Date.now();
    try {
        const urlObj = new URL(req.url);
        const target = urlObj.searchParams.get('url');
        const depth = Number(urlObj.searchParams.get('depth') || '1');
        // Clamp crawl expansion to sane bounds to avoid oversized responses
        const limitRaw = Number(urlObj.searchParams.get('limit') || '5');
        const limit = Math.max(1, Math.min(20, Number.isFinite(limitRaw) ? limitRaw : 5));
        // Optional hard cap on response size (number of pages returned)
        const respMaxRaw = Number(urlObj.searchParams.get('max') || process.env.FIRECRAWL_RESPONSE_MAX || '50');
        const respMax = Math.max(1, Math.min(200, Number.isFinite(respMaxRaw) ? respMaxRaw : 50));
        if (!target) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'url_required', provenance: 'synthetic' }, { path: 'seo-audit/firecrawl', note: 'validation' }), { status: 400 });
        }
        let parsedTarget: URL;
        try { parsedTarget = new URL(target); } catch { return NextResponse.json(enforceProvenance({ success: false, error: 'malformed_url', provenance: 'synthetic' }, { path: 'seo-audit/firecrawl', note: 'validation' }), { status: 400 }); }
        const phaseStart = { quota: Date.now(), crawl: 0 };
        // Quota enforcement (env override FIRECRAWL_HOURLY_LIMIT default 100). Scope: global (future: team/user scope keys)
        const quotaLimit = parseInt(process.env.FIRECRAWL_HOURLY_LIMIT || '100', 10) || 100;
        // Derive scope (team preferred > user > global) – expecting optional headers for now
        const teamId = req.headers.get('x-team-id') || undefined;
        const userId = req.headers.get('x-user-id') || undefined;
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
        // Apply response payload cap with truncation signal
        const totalPages = Array.isArray(crawl.pages) ? crawl.pages.length : 0;
        const pages = totalPages > respMax ? crawl.pages.slice(0, respMax) : crawl.pages;
        const truncated = totalPages > respMax;
        const res = NextResponse.json(enforceProvenance({ success: true, provenance: crawl.fallback ? 'synthetic' : 'live', data: { pages, total: totalPages, returned: pages.length, truncated, fallback: !!crawl.fallback, degradedReason: crawl.degradedReason, timings: { quota_time_ms: quotaTimeMs, crawl_time_ms: crawlTimeMs, analysis_time_ms: analysisTimeMs, total_time_ms: elapsedMs }, quota: { remaining: quota.remaining, resetAt: quota.resetAt.toISOString(), scope: scopeKey } } }, { path: 'seo-audit/firecrawl' }));
        res.headers.set('X-Quota-Remaining', String(quota.remaining));
        res.headers.set('X-Quota-Reset', quota.resetAt.toISOString());
        res.headers.set('X-Result-Total', String(totalPages));
        res.headers.set('X-Result-Returned', String(pages.length));
        if (truncated) res.headers.set('X-Data-Truncated', '1');
        return res;
    } catch (e: unknown) {
        const msg = ((): string => {
            if (e && typeof e === 'object') {
                const rec = e as Record<string, unknown>;
                if (typeof rec.message === 'string') return rec.message;
            }
            return 'crawl_error';
        })();
        return NextResponse.json(enforceProvenance({ success: false, error: msg, provenance: 'synthetic' }, { path: 'seo-audit/firecrawl', note: 'exception' }), { status: 500 });
    }
}, { path: 'seo-audit/firecrawl' });
