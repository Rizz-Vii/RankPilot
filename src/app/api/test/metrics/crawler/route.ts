// Test Metrics Seeding Endpoint (non-production only)
// Purpose: Allow Playwright & local scripts to deterministically raise crawler / semantic map
// aggregate adoption percentages prior to destructive prune gating tests.
// Safety: Disabled in production. No persistence; only in-memory counters mutated.
// Query params:
//   hits: number of aggregate hits to add (default 0)
//   fallbacks: number of legacy fallbacks to add (default 0)
//   domain: 'crawler' | 'semantic' (default 'crawler')
// Response: JSON { domain, added: { hits, fallbacks }, totals: { aggregateHits, legacyFallbacks, adoptionPct } }
// Adoption % = aggregateHits / (aggregateHits + legacyFallbacks) * 100 (null if denom=0)

import { NextRequest, NextResponse } from 'next/server';
import { recordCrawlerAggregateHit, recordCrawlerLegacyFallback, recordSemanticMapAggregateHit, recordSemanticMapLegacyFallback, getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'disabled in production' }, { status: 404 });
    }
    const url = new URL(req.url);
    const hits = Math.min(1000, Math.max(0, parseInt(url.searchParams.get('hits') || '0', 10) || 0));
    const fallbacks = Math.min(1000, Math.max(0, parseInt(url.searchParams.get('fallbacks') || '0', 10) || 0));
    const domain = (url.searchParams.get('domain') || 'crawler').toLowerCase();
    if (domain !== 'crawler' && domain !== 'semantic') {
        return NextResponse.json({ error: 'invalid domain' }, { status: 400 });
    }
    for (let i = 0; i < hits; i++) {
        if (domain === 'crawler') recordCrawlerAggregateHit(); else recordSemanticMapAggregateHit();
    }
    for (let i = 0; i < fallbacks; i++) {
        if (domain === 'crawler') recordCrawlerLegacyFallback(); else recordSemanticMapLegacyFallback();
    }
    const unified = getUnifiedMetricsSnapshot();
    const counters: any = domain === 'crawler' ? ((unified as any).crawler || { aggregateHits: 0, legacyFallbacks: 0 }) : ((unified as any).semanticMap || { aggregateHits: 0, legacyFallbacks: 0 });
    const aHits = (counters as any).aggregateHits || 0;
    const lFallbacks = (counters as any).legacyFallbacks || 0;
    const denom = aHits + lFallbacks;
    const adoptionPct = denom ? +((aHits / denom) * 100).toFixed(2) : null;
    return NextResponse.json({ domain, added: { hits, fallbacks }, totals: { aggregateHits: aHits, legacyFallbacks: lFallbacks, adoptionPct } });
}
