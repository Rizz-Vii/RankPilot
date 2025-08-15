// Test-only route: increment crawler aggregate adoption counters to exercise alerts & KPI.
// Returns 404 in production environments.
import { NextRequest, NextResponse } from 'next/server';
import { recordCrawlerAggregateHit, recordCrawlerLegacyFallback } from '@/lib/metrics/unified-metrics';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }
    const url = new URL(req.url);
    const hits = Number(url.searchParams.get('hits') || '0');
    const fallbacks = Number(url.searchParams.get('fallbacks') || '0');
    for (let i = 0; i < hits; i++) recordCrawlerAggregateHit();
    for (let i = 0; i < fallbacks; i++) recordCrawlerLegacyFallback();
    return NextResponse.json({ ok: true, hitsIncremented: hits, fallbacksIncremented: fallbacks });
}
