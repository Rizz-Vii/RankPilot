import { NextResponse } from 'next/server';
import { AIVisibilityEngine } from '@/lib/neuroseo/ai-visibility-engine';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';

// Lightweight in-memory cache to reduce repeated analyses during a short window
const cache = new Map<string, { ts: number; data: unknown }>();
const TTL_MS = 1000 * 60 * 5; // 5 minutes

export const POST = withProvenance(async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => ({}))) ?? {};
        const { url, query, targetAudience, analysisType = 'quick', userId } = body;

        if (!url || !query) {
            return NextResponse.json({ error: 'Missing url or query' }, { status: 400 });
        }

        const cacheKey = `${url}|${query}|${analysisType}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < TTL_MS) {
            return NextResponse.json(cached.data);
        }

        const engine = new AIVisibilityEngine();
        // Reuse engine API: treat single query as targetKeyword list of length 1
        const report = await engine.analyzeVisibility(url, [query], []);

        // Derive simplified shape expected by client page
        const score = Math.round(report.metrics.overallVisibilityScore);
        const citationRate = report.metrics.citationRate;

        const visibility = report.citations.slice(0, 25).map(c => ({
            citation: {
                platform: (c as any).platform || 'unknown',
                position: (c as any).position ?? 0,
                snippet: (c as any).snippet || '',
                confidence: (c as any).confidence ?? 0,
                url: (c as any).url || url
            },
            optimization: {
                recommendations: (c as any).recommendations?.map((r: any) => r?.description) || [],
                priority: 'medium',
                impact: 50
            }
        }));

        const recommendations = (report.recommendations || []).map((r: any) => r?.description ?? '').filter(Boolean).slice(0, 15);

        const platforms = report.competitiveAnalysis.topCompetitors.slice(0, 8).map(comp => ({
            name: new URL(comp.url).hostname.replace('www.', ''),
            citations: Math.round(comp.citationRate * 10),
            position: Math.max(1, Math.round(100 - comp.visibilityScore)),
            trend: 'stable' as const
        }));

        const responsePayload = enforceProvenance({
            score,
            citationRate,
            visibility,
            recommendations,
            platforms,
            meta: { targetAudience: targetAudience || null, analysisType, userId: userId || null, generatedAt: new Date().toISOString() }
        }, { path: 'neuroseo/ai-visibility' });

        cache.set(cacheKey, { ts: Date.now(), data: responsePayload });
        return NextResponse.json(responsePayload);
    } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        console.error('[AI Visibility API] Failure', errMessage);
        return NextResponse.json(enforceProvenance({ error: 'Internal server error' }, { path: 'neuroseo/ai-visibility', note: 'error' }), { status: 500 });
    }
}, { path: 'neuroseo/ai-visibility' });
