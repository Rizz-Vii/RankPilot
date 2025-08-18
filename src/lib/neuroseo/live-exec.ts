/**
 * NEU-01 Live NeuroSEO Execution Scaffold
 * Strategy: cache -> live (orchestrator) -> synthetic fallback.
 * Provides provenance tagging: 'cache' | 'live' | 'synthetic'.
 */
import { neuroSEOOrchestrator } from './enhanced-orchestrator';
import type { } from './enhanced-orchestrator';
import { createDeterministicRng, tagSynthetic } from '@/lib/synthetic/synthetic-utils';
import { getLogger } from '@/lib/logging/app-logger';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { InMemoryCache } from '@/lib/cache/simple-cache';
import { recordAnalysisRun, recordCacheHit, getNeuroseoMetricsSnapshot, recordWorkflowRun, recordWorkflowFailure } from './metrics-registry';

const logger = getLogger('neuroseo-live');

export type LiveProvenance = 'cache' | 'live' | 'synthetic';

export interface LiveExecRequest {
    urls: string[];
    analysisType?: 'comprehensive' | 'quick' | 'competitor';
    userId: string;
}

// Minimal subset of NeuroSEOReport we rely on here to avoid deep coupling
interface LiveNeuroSEOReport {
    analysisId: string;
    urls: string[];
    overallScore: number;
    analysis: { seoScore: number; performance: number; accessibility: number; bestPractices: number; };
    recommendations: Array<{ category: string; priority: 'high' | 'medium' | 'low'; description: string; implementation: string; }>;
    trustMeta: { modelTag: string; generatedAt: number; dataIntegrity: string; deterministic: boolean; seedBasis: string; };
    cached: boolean;
    keywords?: Array<{ keyword: string; position?: number; volume?: number }>; // optional slice
}

export interface LiveExecResult {
    provenance: LiveProvenance;
    report: LiveNeuroSEOReport; // typed orchestrator report slice
    generatedAt: string;
    latencyMs: number;
}

interface InMemoryEntry { ts: number; result: LiveExecResult }
// NEU-03: TTL configurable via env NEUROSEO_CACHE_TTL_MS (default 5m)
const CACHE_TTL = (() => { const env = process.env.NEUROSEO_CACHE_TTL_MS; const parsed = env ? parseInt(env, 10) : NaN; return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000 * 60 * 5; })();
const cache = new Map<string, InMemoryEntry>();
const swrBackgroundCache = new InMemoryCache<LiveExecResult>(); // for SWR refresh tracking
// OBS-01 / NEU-03 unified metrics
export function getNeuroMetrics() { return getNeuroseoMetricsSnapshot(); }

function cacheKey(req: LiveExecRequest) { return JSON.stringify({ u: [...req.urls].sort(), t: req.analysisType }); }

export async function executeNeuroLive(req: LiveExecRequest, opts?: { timeoutMs?: number; forceRefresh?: boolean }): Promise<LiveExecResult> {
    const start = performance.now();
    const key = cacheKey(req);
    const timeoutMs = opts?.timeoutMs ?? 12_000;

    if (!opts?.forceRefresh) {
        const hit = cache.get(key);
        if (hit) {
            const age = Date.now() - hit.ts;
            if (age < CACHE_TTL) {
                recordCacheHit();
                logger.info('cache.hit', { key: key.slice(0, 24), age });
                // Trigger background refresh if stale threshold exceeded (SWR)
                if (age > CACHE_TTL * 0.5 && !swrBackgroundCache.has(key)) {
                    swrBackgroundCache.set(key, hit.result);
                    executeNeuroLive({ ...req }, { forceRefresh: true }).catch(() => { /* swallow */ });
                }
                return { ...hit.result, latencyMs: Math.round(performance.now() - start), provenance: 'cache' };
            }
        }
    }

    let timedOut = false;
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs));

    try {
        recordWorkflowRun();
        const orchestratorPromise = neuroSEOOrchestrator.runAnalysis({
            urls: req.urls,
            analysisType: (req.analysisType as unknown) || 'comprehensive',
            userId: req.userId || 'anonymous'
        } as any).then(r => r as LiveNeuroSEOReport);
        const report = await Promise.race([orchestratorPromise, timeoutPromise]);
        const result: LiveExecResult = { provenance: 'live', report, generatedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - start) };
        cache.set(key, { ts: Date.now(), result });
        recordAnalysisRun();
        logger.info('live.success', { key: key.slice(0, 24), latency: result.latencyMs, cached: report.cached });
        // Fire and forget persistence (NEU-02)
        persistCompactAnalysis(req.userId, req.urls, req.analysisType || 'comprehensive', result).catch(err => {
            logger.warn('persist.degraded', { message: err?.message });
        });
        return result;
    } catch (err: unknown) {
        const msg = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : 'unknown';
        logger.warn('live.degraded', { reason: timedOut ? 'timeout' : 'error', message: msg });
        recordWorkflowFailure();
        const rng = createDeterministicRng([req.urls.join('|'), req.analysisType, 'synthetic']);
        const synthetic = tagSynthetic({
            analysisId: 'synthetic_' + Date.now().toString(36),
            urls: req.urls,
            overallScore: Math.round(rng() * 30 + 60),
            analysis: { seoScore: 70 + Math.round(rng() * 10), performance: 65 + Math.round(rng() * 15), accessibility: 70 + Math.round(rng() * 10), bestPractices: 75 + Math.round(rng() * 10) },
            recommendations: [],
            trustMeta: { modelTag: 'synthetic-fallback', generatedAt: Date.now(), dataIntegrity: 'simulated', deterministic: true, seedBasis: 'syn' },
            cached: false
        });
        const fallback: LiveExecResult = { provenance: 'synthetic', report: synthetic, generatedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - start) };
        persistCompactAnalysis(req.userId, req.urls, req.analysisType || 'comprehensive', fallback).catch(err => {
            logger.warn('persist.degraded', { message: err?.message });
        });
        return fallback;
    }
}

export function purgeLiveCache() { cache.clear(); }
export function getLiveCacheStats() { return { size: cache.size }; }
// Zod schema for compact persisted doc (NEU-03 extension)
export const CompactAnalysisSchema = z.object({
    userId: z.string(),
    overallScore: z.number(),
    createdAt: z.date(),
    urls: z.array(z.string()).min(1),
    hashKey: z.string(),
    topKeywords: z.array(z.object({ keyword: z.string(), position: z.number().optional(), volume: z.number().optional() })).max(10),
    __provenance: z.enum(['live', 'synthetic', 'cache']),
    schema: z.literal('v1')
});

// ---------------- NEU-02 Persistence ----------------
function stableHashKey(urls: string[], analysisType?: string) {
    try {
        return Buffer.from(JSON.stringify({ u: [...urls].sort(), t: analysisType || 'comprehensive' })).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
    } catch { return 'hash_err'; }
}

async function persistCompactAnalysis(userId: string, urls: string[], analysisType: string, result: LiveExecResult) {
    if (!userId) return; // require user context
    const hashKey = stableHashKey(urls, analysisType);
    const docId = hashKey; // deterministic idempotent upsert
    const report: LiveNeuroSEOReport = result.report as LiveNeuroSEOReport;
    // Extract compact slice (avoid large arrays)
    const topKeywords = Array.isArray(report.keywords) ? report.keywords.slice(0, 10).map(k => ({
        keyword: k.keyword,
        position: k.position,
        volume: k.volume
    })) : [];
    const payload = {
        userId,
        overallScore: report.overallScore ?? report.analysis.seoScore ?? 0,
        createdAt: new Date(),
        urls: [...urls].slice(0, 10),
        hashKey,
        topKeywords,
        __provenance: result.provenance,
        schema: 'v1'
    };
    const parsed = CompactAnalysisSchema.safeParse(payload);
    if (!parsed.success) {
        logger.warn('persist.validation_failed', { issues: parsed.error.issues.length });
        return;
    }
    await adminDb.collection('neuroSeoAnalyses').doc(docId).set(parsed.data, { merge: true });
    logger.info('persist.success', { hashKey: hashKey.slice(0, 16), provenance: result.provenance });
}
