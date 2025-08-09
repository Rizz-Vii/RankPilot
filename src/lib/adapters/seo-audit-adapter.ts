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

export function adaptSEOAuditResponse(raw: any, meta: { fallback?: boolean; startedAt?: number } = {}): SEOAuditUnifiedResponse {
    const startedAt = meta.startedAt || Date.now();
    const end = Date.now();

    // Determine items
    const items: SEOAuditItem[] = Array.isArray(raw?.items)
        ? raw.items.map((it: any, i: number) => ({
            id: String(it?.id || i),
            name: String(it?.name || it?.title || 'Unknown Item'),
            score: typeof it?.score === 'number' ? it.score : 0,
            details: String(it?.details || it?.description || 'No details provided'),
            status: (['good', 'warning', 'error'].includes(it?.status) ? it.status : 'warning') as 'good' | 'warning' | 'error',
        }))
        : [];

    // Compute overall score if missing
    let overallScore = typeof raw?.overallScore === 'number' ? raw.overallScore : 0;
    if (!overallScore && items.length) {
        overallScore = Math.round(items.reduce((a, b) => a + (b.score || 0), 0) / items.length);
    }

    const cacheHit: boolean = !!raw?.cacheHit;
    // Derive source priority: explicit > fallback flag > cacheHit inference
    let source: 'live' | 'cache' | 'fallback' | undefined = raw?.source;
    if (!source) {
        if (meta.fallback) source = 'fallback';
        else if (cacheHit) source = 'cache';
        else source = 'live';
    }

    // Quota normalization
    let quota: SEOAuditUnifiedResponse['quota'];
    if (raw?.quota && typeof raw.quota === 'object') {
        const { limit, used, remaining } = raw.quota;
        quota = {
            limit: typeof limit === 'number' ? limit : -1,
            used: typeof used === 'number' ? used : 0,
            remaining: typeof remaining === 'number'
                ? remaining
                : typeof limit === 'number' && typeof used === 'number'
                    ? Math.max(0, limit - used)
                    : -1,
        };
    }

    return {
        url: raw?.url,
        overallScore,
        items,
        summary: String(raw?.summary || 'No summary provided.'),
        totalProcessingTime: typeof raw?.totalProcessingTime === 'number' ? raw.totalProcessingTime : end - startedAt,
        cacheHit,
        quota,
        source,
    };
}
