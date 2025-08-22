// Adapter for normalizing SEO Audit backend responses to unified shape
// Handles legacy shapes, Genkit flow output, and Cloud Function enriched output

export type SEOAuditItem = {
    id: string;
    name: string;
    score: number;
    details: string;
    status: 'good' | 'warning' | 'error';
};

export interface SEOAuditUnifiedResponse {
    url?: string;
    overallScore: number;
    items: SEOAuditItem[];
    summary: string;
    totalProcessingTime: number; // ms
    cacheHit: boolean;
    quota?: { limit: number; used: number; remaining: number };
    source?: 'live' | 'cache' | 'fallback';
}
export function adaptSEOAuditResponse(
    raw: unknown,
    meta: { fallback?: boolean; startedAt?: number } = {}
): SEOAuditUnifiedResponse {
    // Prefer an explicit numeric startedAt when provided (0 is valid)
    const startedAt = typeof meta.startedAt === 'number' ? meta.startedAt : Date.now();
    const end = Date.now();

    // Normalize incoming raw object to a record for safe access
    const r = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    // Items extraction with defensive checks
    const rawItemsCandidate = (r as Record<string, unknown>).items;
    const itemsRaw: unknown[] = Array.isArray(rawItemsCandidate) ? rawItemsCandidate : [];
    const items: SEOAuditItem[] = itemsRaw.map((it, i) => {
        const o = it !== null && typeof it === 'object' ? (it as Record<string, unknown>) : {};
        const statusRaw = (o as Record<string, unknown>).status;
        const status =
            statusRaw === 'good' || statusRaw === 'warning' || statusRaw === 'error'
                ? (statusRaw as 'good' | 'warning' | 'error')
                : 'warning';

        return {
            id: String((o as Record<string, unknown>).id ?? i),
            name: String((o as Record<string, unknown>).name ?? (o as Record<string, unknown>).title ?? 'Unknown Item'),
            score: typeof (o as Record<string, unknown>).score === 'number' ? ((o as Record<string, unknown>).score as number) : 0,
            details: String((o as Record<string, unknown>).details ?? (o as Record<string, unknown>).description ?? 'No details provided'),
            status,
        };
    });

    // Compute overall score only when the source didn't provide one.
    // This preserves an explicit overallScore of 0.
    const providedOverall = (r as Record<string, unknown>).overallScore;
    let overallScore = typeof providedOverall === 'number' ? (providedOverall as number) : 0;
    if (typeof providedOverall !== 'number' && items.length) {
        overallScore = Math.round(items.reduce((sum, it) => sum + (it.score || 0), 0) / items.length);
    }

    const cacheHit = Boolean((r as Record<string, unknown>).cacheHit);

    // Derive source priority: explicit > fallback flag > cacheHit inference
    let source: 'live' | 'cache' | 'fallback' | undefined = ((): 'live' | 'cache' | 'fallback' | undefined => {
        const candidate = (r as Record<string, unknown>).source;
        return candidate === 'live' || candidate === 'cache' || candidate === 'fallback'
            ? (candidate as 'live' | 'cache' | 'fallback')
            : undefined;
    })();

    if (!source) {
        if (meta.fallback) source = 'fallback';
        else if (cacheHit) source = 'cache';
        else source = 'live';
    }

    // Quota normalization (defensive)
    let quota: SEOAuditUnifiedResponse['quota'] | undefined;
    if ((r as Record<string, unknown>).quota && typeof (r as Record<string, unknown>).quota === 'object') {
        const { limit, used, remaining } = (r as Record<string, unknown>).quota as Record<string, unknown>;
        quota = {
            limit: typeof limit === 'number' ? limit : -1,
            used: typeof used === 'number' ? used : 0,
            remaining:
                typeof remaining === 'number'
                    ? remaining
                    : typeof limit === 'number' && typeof used === 'number'
                        ? Math.max(0, limit - used)
                        : -1,
        };
    }

    return {
        url: (() => {
            const candidate = (r as Record<string, unknown>).url;
            return typeof candidate === 'string' ? candidate : undefined;
        })(),
        overallScore,
        items,
        summary: String((r as Record<string, unknown>).summary ?? 'No summary provided.'),
        totalProcessingTime:
            typeof (r as Record<string, unknown>).totalProcessingTime === 'number'
                ? ((r as Record<string, unknown>).totalProcessingTime as number)
                : end - startedAt,
        cacheHit,
        quota,
        source,
    };
}
