import type { NextRequest } from 'next/server';
import { neuroSEOOrchestrator } from '@/lib/neuroseo/enhanced-orchestrator';
import { getLogger } from '@/lib/logging/app-logger';
import { createDeterministicRng, tagSynthetic } from '@/lib/synthetic/synthetic-utils';
import { adminDb } from '@/lib/firebase-admin';
import { CompactAnalysisSchema } from '@/lib/neuroseo/live-exec';
import { recordAnalysisRun, recordCacheHit, recordWorkflowRun, recordWorkflowFailure, recordGuardStrip } from '@/lib/neuroseo/metrics-registry';
import { enforceProvenanceOnChunk } from '@/lib/middleware/provenance';
import { recordRouteLatency, recordFallback, recordCompactDocSize } from '@/lib/metrics/unified-metrics';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';
import { enforceNeuroSeoRateLimit, NeuroSeoRateLimitError } from '@/lib/neuroseo/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const logger = getLogger('api.neuroseo.stream').withTrace();

interface StreamPayload { urls?: string[]; analysisType?: string; userId?: string; timeoutMs?: number; teamId?: string; }

function sseEncoder(): (controller: ReadableStreamDefaultController, event: string, data: Record<string, unknown>) => void {
    const encoder = new TextEncoder();
    return (controller: ReadableStreamDefaultController, event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };
}

async function persistCompact(urls: string[], analysisType: string, userId: string | undefined, overallScore: number, provenance: 'live' | 'cache' | 'synthetic'): Promise<void> {
    if (!userId) return;
    try {
        const hashKey = Buffer.from(JSON.stringify({ u: [...urls].sort(), t: analysisType }))
            .toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
        const payload = { userId, overallScore, createdAt: new Date(), urls: [...urls].slice(0, 10), hashKey, topKeywords: [], __provenance: provenance, schema: 'v1' };
        const parsed = CompactAnalysisSchema.safeParse(payload as unknown);
        if (!parsed.success) { logger.warn('persist.validation_failed', { issues: parsed.error.issues.length }); return; }
        const size = Buffer.byteLength(JSON.stringify(parsed.data), 'utf8');
        recordCompactDocSize(size);
        if (size > 5000) { logger.warn('persist.size_exceeded', { size }); return; }
        await adminDb.collection('neuroSeoAnalyses').doc(hashKey).set(parsed.data, { merge: true });
        logger.info('persist.stream.success', { hashKey: hashKey.slice(0, 16), provenance, size });
    } catch (e: unknown) { logger.warn('persist.stream.degraded', { message: (e as any)?.message }); }
}

export async function POST(request: NextRequest): Promise<Response> {
    let payload: StreamPayload;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 }); }
    const { urls = [], analysisType = 'comprehensive', userId = 'anonymous', timeoutMs = 12000, teamId } = payload;
    if (!Array.isArray(urls) || urls.length === 0) { recordGuardStrip(); return new Response(JSON.stringify({ error: 'urls array required' }), { status: 400 }); }
    if (urls.length > 50) { recordGuardStrip(); return new Response(JSON.stringify({ error: 'too_many_urls' }), { status: 400 }); }

    recordWorkflowRun();
    const startHr = process.hrtime.bigint();
    const deadline = Date.now() + timeoutMs;
    let finished = false; let finalProvenance: string | undefined;

    const stream = new ReadableStream({
        async start(controller) {
            const write = sseEncoder();
            const finalize = (provenance: string, ok = true) => {
                if (finished) return; finished = true;
                const durationMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
                recordRouteLatency('neuroseo/stream', durationMs);
                write(controller, 'end', { ok, durationMs, provenance: finalProvenance || provenance });
                try { controller.close(); } catch { }
            };
            request.signal.addEventListener('abort', () => { logger.warn('client.disconnected'); finalize(finalProvenance || 'aborted', false); });
            write(controller, 'ack', { received: urls.length, analysisType });
            try {
                // TEAM-01: Apply team limiter if teamId provided else legacy per-user limiter for transition period.
                const g = globalThis as unknown as { adminDb?: typeof adminDb };
                if (typeof teamId === 'string' && teamId) {
                    const { adminDb: _adminDb } = g.adminDb ? { adminDb: g.adminDb } : await import('@/lib/firebase-admin');
                    await enforceTeamRateLimit(_adminDb, teamId, { routeKey: 'neuroseo/stream' });
                } else {
                    const admin = g.adminDb || (await import('@/lib/firebase-admin')).adminDb;
                    await enforceNeuroSeoRateLimit(admin, userId, {});
                }
                const allowedTypes = ['comprehensive', 'quick', 'competitor'] as const;
                const atype = (allowedTypes as readonly string[]).includes(analysisType) ? (analysisType as typeof allowedTypes[number]) : 'comprehensive';
                const orchestration = neuroSEOOrchestrator.runAnalysisStream({ urls, analysisType: atype, userId });
                for await (const evt of orchestration) {
                    if (evt.type === 'cached') { recordCacheHit(); finalProvenance = 'cache'; }
                    if (evt.type === 'complete') { recordAnalysisRun(); finalProvenance = evt.data.provenance; await persistCompact(urls, analysisType, userId, evt.data.overallScore, evt.data.provenance); }
                    write(controller, evt.type, enforceProvenanceOnChunk(evt.data as any, { path: 'neuroseo/stream' }) as unknown as Record<string, unknown>);
                    if (Date.now() > deadline && !finished && evt.type !== 'complete') {
                        logger.warn('stream.timeout', { partial: true }); recordFallback('timeout');
                        const rng = createDeterministicRng([urls.join('|'), analysisType, 'synthetic-stream']);
                        const synthetic = tagSynthetic({ analysisId: 'synthetic_' + Date.now().toString(36), urls, overallScore: Math.round(rng() * 30 + 60), cached: false });
                        write(controller, 'fallback', enforceProvenanceOnChunk({ provenance: 'synthetic', overallScore: synthetic.overallScore }, { path: 'neuroseo/stream' }) as unknown as Record<string, unknown>);
                        await persistCompact(urls, analysisType, userId, synthetic.overallScore, 'synthetic');
                        finalProvenance = 'synthetic'; finalize('synthetic'); return;
                    }
                }
                finalize(finalProvenance || 'live');
            } catch (error: unknown) {
                if (error instanceof TeamRateLimitError || error instanceof NeuroSeoRateLimitError) {
                    write(controller, 'rate_limited', enforceProvenanceOnChunk({ error: 'rate_limited', retryAfter: (error as any)?.retryAfterSeconds || 60, provenance: 'synthetic' }, { path: 'neuroseo/stream' }) as unknown as Record<string, unknown>);
                    recordFallback('rate_limited');
                    finalize('synthetic', false);
                    return;
                }
                logger.error('stream.failed', { error: (error as any)?.message }); recordWorkflowFailure(); recordFallback('backend_error');
                write(controller, 'error', enforceProvenanceOnChunk({ message: (error as any)?.message || 'analysis failed', provenance: 'synthetic' }, { path: 'neuroseo/stream' }) as unknown as Record<string, unknown>);
                const rng = createDeterministicRng([urls.join('|'), analysisType, 'synthetic-error']);
                const synthetic = tagSynthetic({ analysisId: 'synthetic_' + Date.now().toString(36), urls, overallScore: Math.round(rng() * 30 + 60), cached: false });
                write(controller, 'fallback', enforceProvenanceOnChunk({ provenance: 'synthetic', overallScore: synthetic.overallScore }, { path: 'neuroseo/stream' }) as unknown as Record<string, unknown>);
                await persistCompact(urls, analysisType, userId, synthetic.overallScore, 'synthetic');
                finalProvenance = 'synthetic'; finalize('synthetic', false);
            }
        }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } });
}
