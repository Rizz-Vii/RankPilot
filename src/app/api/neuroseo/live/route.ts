import { handleCors } from '@/lib/http/cors';
import { getLogger } from '@/lib/logging/app-logger';
import { recordError, recordRouteLatency } from '@/lib/metrics/unified-metrics';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import { executeNeuroLive } from '@/lib/neuroseo/live-exec';
import { enforceNeuroSeoRateLimit, NeuroSeoRateLimitError } from '@/lib/neuroseo/rate-limit';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const logger = getLogger('neuroseo-live-route');

// Feature gate simple env flag (rolling_out). In future, read FEATURE_KEYS.
const ENABLED = true;

export const POST = withProvenance(async function POST(req: NextRequest) {
    const start = Date.now();
    // CORS handling and header base
    const cors = handleCors(req as unknown as Request);
    if ('preflight' in cors) return cors.preflight as unknown as NextResponse;
    const baseHeaders: Record<string, string> = {
        ...('headers' in cors ? cors.headers : {}),
        'Cache-Control': 'no-store, no-transform',
        'Vary': 'Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    };
    if (!ENABLED) {
        return NextResponse.json(
            enforceProvenance({ success: false, error: 'Live backend disabled', provenance: 'synthetic' }, { path: 'neuroseo/live', note: 'feature_gate' }),
            { status: 503, headers: baseHeaders }
        );
    }
    try {
        let body: unknown = {};
        try {
            body = await req.json();
        } catch {
            body = {};
        }
        interface IncomingBody { urls?: unknown; analysisType?: unknown; userId?: unknown; forceRefresh?: unknown; teamId?: unknown; }
        const { urls, analysisType, userId, forceRefresh, teamId } = (body as IncomingBody) || {};
        const urlArray: string[] = Array.isArray(urls) ? urls.filter(u => typeof u === 'string') as string[] : [];
        const allowedTypes = ['comprehensive', 'quick', 'competitor'] as const;
        const atype = (typeof analysisType === 'string' && (allowedTypes as readonly string[]).includes(analysisType)) ? analysisType as typeof allowedTypes[number] : undefined;
        const uid = typeof userId === 'string' && userId ? userId : 'anonymous';
        const force = typeof forceRefresh === 'boolean' ? forceRefresh : false;
        if (!Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'urls[] required', provenance: 'synthetic' }, { path: 'neuroseo/live', note: 'validation' }), { status: 400, headers: baseHeaders });
        }
        // PERF-01 / TEAM-01: Prefer team-aware limiter when teamId supplied; otherwise fallback to legacy per-user neuroseo limiter for backward compatibility during transition.
        try {
            if (typeof teamId === 'string' && teamId) {
                const g = global as unknown as { adminDb?: unknown };
                const imported = await import('@/lib/firebase-admin');
                const candidate = (g.adminDb && typeof g.adminDb === 'object') ? g.adminDb : imported.adminDb;
                const resolvedAdmin = (candidate && typeof candidate === 'object' && 'collection' in candidate)
                    ? candidate as typeof imported.adminDb
                    : imported.adminDb;
                await enforceTeamRateLimit(resolvedAdmin, teamId, { routeKey: 'neuroseo/live' });
            } else {
                const scopeId = uid; // already narrowed to string above
                const g = global as unknown as { adminDb?: unknown };
                const imported = await import('@/lib/firebase-admin');
                const candidate = (g.adminDb && typeof g.adminDb === 'object') ? g.adminDb : imported.adminDb;
                const resolvedAdmin = (candidate && typeof candidate === 'object' && 'collection' in candidate)
                    ? candidate as typeof imported.adminDb
                    : imported.adminDb;
                await enforceNeuroSeoRateLimit(resolvedAdmin, scopeId);
            }
        } catch (e: unknown) {
            if (e instanceof TeamRateLimitError || e instanceof NeuroSeoRateLimitError) {
                const retryAfterSeconds = (e && typeof e === 'object' && 'retryAfterSeconds' in e && typeof (e as { retryAfterSeconds?: unknown }).retryAfterSeconds === 'number')
                    ? (e as { retryAfterSeconds: number }).retryAfterSeconds
                    : 60;
                return NextResponse.json(
                    enforceProvenance({ success: false, error: 'rate_limited', retryAfter: retryAfterSeconds, provenance: 'synthetic' }, { path: 'neuroseo/live', note: 'rate_limit' }),
                    { status: 429, headers: { ...baseHeaders, 'Retry-After': String(retryAfterSeconds) } }
                );
            }
            throw e;
        }
        const result = await executeNeuroLive({ urls: urlArray, analysisType: atype, userId: uid }, { forceRefresh: force });
        const resp = NextResponse.json(enforceProvenance({ ...result }, { path: 'neuroseo/live' }), { status: 200, headers: baseHeaders });
        recordRouteLatency('neuroseo/live', Date.now() - start);
        return resp;
    } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        logger.error('live.route.error', { message: errMessage, origin: (req.headers.get('origin') || 'n/a'), referer: (req.headers.get('referer') || 'n/a') });
        recordRouteLatency('neuroseo/live', Date.now() - start);
        recordError('neuroseo/live', '5xx_server');
        return NextResponse.json(
            enforceProvenance({ error: errMessage || 'analysis failed', provenance: 'synthetic' }, { path: 'neuroseo/live' }),
            { status: (errMessage?.includes('timeout') ? 503 : 500), headers: baseHeaders }
        );
    }
}, { path: 'neuroseo/live' });
