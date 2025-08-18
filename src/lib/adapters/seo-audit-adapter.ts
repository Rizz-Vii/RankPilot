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

export function adaptSEOAuditResponse(raw: unknown, meta: { fallback?: boolean; startedAt?: number } = {}): SEOAuditUnifiedResponse {
    const startedAt = meta.startedAt || Date.now();
    const end = Date.now();

    // Determine items
    const r = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
    const itemsRaw = Array.isArray((r as any).items) ? (r as any).items as unknown[] : [];
    const items: SEOAuditItem[] = itemsRaw.map((it, i) => {
        const o = (it && typeof it === 'object') ? it as Record<string, unknown> : {};
        const statusRaw = o.status;
        const status: 'good' | 'warning' | 'error' = (statusRaw === 'good' || statusRaw === 'warning' || statusRaw === 'error') ? statusRaw : 'warning';
        return {
            id: String(o.id ?? i),
            name: String(o.name ?? o.title ?? 'Unknown Item'),
            score: typeof o.score === 'number' ? o.score : 0,
            details: String(o.details ?? o.description ?? 'No details provided'),
            status,
        };
    });

    // Compute overall score if missing
    let overallScore = typeof r.overallScore === 'number' ? (r.overallScore as number) : 0;
    if (!overallScore && items.length) {
        overallScore = Math.round(items.reduce((a, b) => a + (b.score || 0), 0) / items.length);
    }

    const cacheHit: boolean = !!r.cacheHit;
    // Derive source priority: explicit > fallback flag > cacheHit inference
    let source: 'live' | 'cache' | 'fallback' | undefined = (r.source as any);
    if (!source) {
        if (meta.fallback) source = 'fallback';
        else if (cacheHit) source = 'cache';
        else source = 'live';
    }

    // Quota normalization
    let quota: SEOAuditUnifiedResponse['quota'];
    if (r.quota && typeof r.quota === 'object') {
        const { limit, used, remaining } = r.quota as Record<string, unknown>;
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
        url: typeof r.url === 'string' ? r.url : undefined,
        overallScore,
        items,
        summary: String(r.summary || 'No summary provided.'),
        totalProcessingTime: typeof r.totalProcessingTime === 'number' ? (r.totalProcessingTime as number) : end - startedAt,
        cacheHit,
        quota,
        source,
    };
}
