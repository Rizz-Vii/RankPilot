import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
    if (process.env.NODE_ENV === 'production' || process.env.CI_PRODUCTION === '1') {
        return NextResponse.json({ ok: false, reason: 'disabled' }, { status: 404 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const ref = adminDb.collection('kpiDaily').doc(today);
    try {
        await adminDb.runTransaction(async tx => {
            const snap = await tx.get(ref);
            if (snap.exists) return; // no-op if already seeded
            const doc: any = {
                date: today,
                provenanceCoveragePct: 95,
                p95LatencyOverall: 450,
                crawlerAggregateAdoptionPct: 70,
                semanticMapAggregateAdoptionPct: 68,
                aiCostEstimate: 1.23,
                createdAt: new Date(),
                updatedAt: new Date(),
                // Provide initial smoothing = metric values so deltas start at 0
                smoothedProvenance: 95,
                smoothedLatencyP95: 450,
                smoothedCrawlerAdoption: 70,
                smoothedSemanticAdoption: 68,
                // Include MA7 fields mirroring values for immediate delta badge availability
                ma7Provenance: 95,
                ma7LatencyP95: 450,
                ma7CrawlerAdoption: 70,
                ma7SemanticAdoption: 68
            } as any;
            tx.set(ref, doc);
        });
        return NextResponse.json({ ok: true, seeded: true, date: today });
    } catch (e: unknown) {
        return NextResponse.json({ ok: false, error: (e as any)?.message || 'seed_failed' }, { status: 500 });
    }
}
