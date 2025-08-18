/**
 * Firecrawl Integration (T10 – initial scaffold)
 * Optional depth-limited crawl with soft fallback when API key absent or failure.
 */
import { recordError, recordFallback, recordRouteLatency } from '@/lib/metrics/unified-metrics';
import { firecrawlCrawlResponseSchema } from '@/lib/crawler/schema';

export interface FirecrawlPageResult { url: string; content?: string; status?: number; title?: string; links?: string[]; canonicalUrl?: string; metaDescription?: string; }
export interface FirecrawlCrawlOptions { depth?: number; limit?: number; timeoutMs?: number; userAgent?: string; }
export interface FirecrawlCrawlResponse { pages: FirecrawlPageResult[]; fallback?: boolean; degradedReason?: string; elapsedMs: number; }

const DEFAULTS = { depth: 1, limit: 5, timeoutMs: 15000 };

function synthetic(target: string, reason: string): FirecrawlCrawlResponse {
    return { pages: [{ url: target, content: 'SYNTHETIC_CRAWL_CONTENT', status: 200, title: 'Synthetic Crawl', links: [], canonicalUrl: target, metaDescription: `Synthetic description for ${target}` }], fallback: true, degradedReason: reason, elapsedMs: 0 };
}

export async function runFirecrawl(targetUrl: string, opts: FirecrawlCrawlOptions = {}): Promise<FirecrawlCrawlResponse> {
    const start = Date.now();
    const key = process.env.FIRECRAWL_API_KEY;
    const depth = opts.depth ?? DEFAULTS.depth;
    const limit = opts.limit ?? DEFAULTS.limit;
    const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;
    if (!key) { recordFallback('firecrawl:no_api_key'); return synthetic(targetUrl, 'no_api_key'); }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const resp = await fetch('https://api.firecrawl.dev/v1/crawl', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ url: targetUrl, maxDepth: depth, limit, formats: ['markdown'] }), signal: controller.signal });
        if (!resp.ok) { recordFallback('firecrawl:http_' + resp.status); return synthetic(targetUrl, 'http_' + resp.status); }
        const json = await resp.json();
        const raw: any[] = Array.isArray(json?.pages) ? json.pages : [];
        const pages: FirecrawlPageResult[] = raw.slice(0, limit).map(p => {
            const links = Array.isArray(p.links) ? p.links.filter((l: any) => typeof l === 'string').slice(0, 50) : [];
            const metaDescSource = typeof p.metaDescription === 'string' ? p.metaDescription : (p.meta && typeof p.meta.description === 'string' ? p.meta.description : undefined);
            return {
                url: typeof p.url === 'string' ? p.url : targetUrl,
                content: typeof p.markdown === 'string' ? p.markdown : (typeof p.html === 'string' ? p.html : ''),
                status: typeof p.status === 'number' ? p.status : 200,
                title: typeof p.title === 'string' ? p.title : '',
                links,
                canonicalUrl: typeof p.canonicalUrl === 'string' ? p.canonicalUrl : undefined,
                metaDescription: metaDescSource
            };
        });
        const validation = firecrawlCrawlResponseSchema.safeParse({ pages });
        const elapsedMs = Date.now() - start; recordRouteLatency('firecrawl/crawl', elapsedMs);
        if (!validation.success) { recordFallback('firecrawl:validation'); return { ...synthetic(targetUrl, 'validation'), elapsedMs }; }
        return { pages: validation.data.pages as FirecrawlPageResult[], elapsedMs };
    } catch (e: unknown) {
        const elapsedMs = Date.now() - start; if (e && typeof e === 'object' && 'name' in e && (e as any).name === 'AbortError') { recordFallback('firecrawl:timeout'); return { ...synthetic(targetUrl, 'timeout'), elapsedMs }; }
        recordError('firecrawl/crawl', '5xx_server'); recordFallback('firecrawl:exception'); return { ...synthetic(targetUrl, 'exception'), elapsedMs };
    }
    finally { clearTimeout(t); }
}
