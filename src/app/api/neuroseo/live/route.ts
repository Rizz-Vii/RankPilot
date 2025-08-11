import { NextRequest, NextResponse } from 'next/server';
import { executeNeuroLive } from '@/lib/neuroseo/live-exec';
import { enforceNeuroSeoRateLimit, NeuroSeoRateLimitError } from '@/lib/neuroseo/rate-limit';
import { getLogger } from '@/lib/logging/app-logger';

export const dynamic = 'force-dynamic';
const logger = getLogger('neuroseo-live-route');

// Feature gate simple env flag (rolling_out). In future, read FEATURE_KEYS.
const ENABLED = true;

export async function POST(req: NextRequest) {
    if (!ENABLED) return NextResponse.json({ error: 'Live backend disabled' }, { status: 503 });
    try {
        const body = await req.json().catch(() => ({}));
        const { urls, analysisType, userId, forceRefresh, teamId } = body || {};
        if (!Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: 'urls[] required' }, { status: 400 });
        }
        // PERF-01: Rate limit per user (team scope later)
        const scopeId = teamId ? `team:${teamId}` : (userId || 'anonymous');
        const limitOpts = teamId ? { limit: 200 } : {}; // higher limit for team scope (Phase 1 heuristic)
        try {
            await enforceNeuroSeoRateLimit((global as any).adminDb || (await import('@/lib/firebase-admin')).adminDb, scopeId, limitOpts);
        } catch (e: any) {
            if (e instanceof NeuroSeoRateLimitError) {
                return NextResponse.json({ error: 'rate_limited', retryAfter: e.retryAfterSeconds }, { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } });
            }
            throw e;
        }
        const result = await executeNeuroLive({ urls, analysisType, userId: userId || 'anonymous' }, { forceRefresh });
        return NextResponse.json(result);
    } catch (err: any) {
        logger.error('live.route.error', { message: err?.message });
        return NextResponse.json({ error: 'internal error' }, { status: 500 });
    }
}
