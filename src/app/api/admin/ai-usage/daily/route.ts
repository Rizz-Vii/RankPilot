import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Historical daily AI usage (Phase 4 Observability seed)
// Query params: start=YYYY-MM-DD (inclusive), end=YYYY-MM-DD (inclusive, optional)
// Returns sorted array of { date, provider, tokensIn, tokensOut, costEstimate, models }

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const seed = searchParams.get('seed');
    // Lightweight auth gate: if OBSERVABILITY_API_KEY set, require matching header (non-production only feature gate substitute)
    const requiredKey = process.env.OBSERVABILITY_API_KEY;
    if (requiredKey) {
        const provided = req.headers.get('x-observability-key');
        if (provided !== requiredKey) {
            return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }
    }
    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
        return NextResponse.json({ error: 'start (YYYY-MM-DD) required' }, { status: 400 });
    }
    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        return NextResponse.json({ error: 'end must be YYYY-MM-DD' }, { status: 400 });
    }
    const startDate = start;
    const endDate = end || start;
    try {
        // Optional test seeding (non-production only)
        if (seed && process.env.NODE_ENV !== 'production') {
            const ref = adminDb.collection('aiUsageDaily').doc(`${startDate}_openai`);
            const snap = await ref.get();
            if (!snap.exists) {
                await ref.set({
                    date: startDate,
                    provider: 'openai',
                    tokensIn: 111,
                    tokensOut: 222,
                    costEstimate: 0.1234,
                    models: { 'gpt-4o': { tokensIn: 111, tokensOut: 222 } },
                    seededAt: new Date().toISOString(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        const snap = await adminDb.collection('aiUsageDaily')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'asc')
            .limit(500)
            .get();
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as Record<string, unknown>));
        return NextResponse.json({ range: { start: startDate, end: endDate }, count: rows.length, rows });
    } catch (e: unknown) {
        const err = e as { message?: string };
        return NextResponse.json({ error: 'query_failed', message: err.message || 'Unknown error' }, { status: 500 });
    }
}
