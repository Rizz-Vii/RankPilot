import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { executeNeuroLive } from '@/lib/neuroseo/live-exec';
import { enforceNeuroSeoRateLimit, NeuroSeoRateLimitError } from '@/lib/neuroseo/rate-limit';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import { getLogger } from '@/lib/logging/app-logger';
import { recordRouteLatency, recordError } from '@/lib/metrics/unified-metrics';

export const dynamic = 'force-dynamic';
const logger = getLogger('neuroseo-live-route');

// Feature gate simple env flag (rolling_out). In future, read FEATURE_KEYS.
const ENABLED = true;

export const POST = withProvenance(async function POST(req: NextRequest) {
    const start = Date.now();
    if (!ENABLED) return NextResponse.json(enforceProvenance({ success: false, error: 'Live backend disabled', provenance: 'synthetic' }, { path: 'neuroseo/live', note: 'feature_gate' }), { status: 503 });
    try {
        const body = await req.json().catch(() => ({}));
        const { urls, analysisType, userId, forceRefresh, teamId } = body || {};
        if (!Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'urls[] required', provenance: 'synthetic' }, { path: 'neuroseo/live', note: 'validation' }), { status: 400 });
        }
        // PERF-01 / TEAM-01: Prefer team-aware limiter when teamId supplied; otherwise fallback to legacy per-user neuroseo limiter for backward compatibility during transition.
        try {
            if (typeof teamId === 'string' && teamId) {
                const { adminDb } = (global as any).adminDb ? { adminDb: (global as any).adminDb } : await import('@/lib/firebase-admin');
                await enforceTeamRateLimit(adminDb, teamId, { routeKey: 'neuroseo/live' });
            } else {
                const scopeId = userId || 'anonymous';
                await enforceNeuroSeoRateLimit((global as any).adminDb || (await import('@/lib/firebase-admin')).adminDb, scopeId, {});
            }
        } catch (e: unknown) {
            if (e instanceof TeamRateLimitError || e instanceof NeuroSeoRateLimitError) {
                const retryAfterSeconds = (e as any)?.retryAfterSeconds || 60;
                return NextResponse.json(enforceProvenance({ success: false, error: 'rate_limited', retryAfter: retryAfterSeconds, provenance: 'synthetic' }, { path: 'neuroseo/live', note: 'rate_limit' }), { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
            }
            throw e;
        }
        const result = await executeNeuroLive({ urls, analysisType, userId: userId || 'anonymous' }, { forceRefresh });
        const resp = NextResponse.json(enforceProvenance({ ...result }, { path: 'neuroseo/live' }), { status: 200 });
        recordRouteLatency('neuroseo/live', Date.now() - start);
        return resp;
    } catch (err: unknown) {
        logger.error('live.route.error', { message: (err as any)?.message });
        recordRouteLatency('neuroseo/live', Date.now() - start);
        recordError('neuroseo/live', '5xx_server');
        return NextResponse.json(enforceProvenance({ error: (err as any)?.message || 'analysis failed', provenance: 'synthetic' }, { path: 'neuroseo/live' }), { status: 500 });
    }
}, { path: 'neuroseo/live' });
