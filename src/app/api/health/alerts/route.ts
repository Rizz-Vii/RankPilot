import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Health Alerts History API
// Returns recent persisted alert snapshots from kpiAlertsDaily (newest first).
// Query params: ?limit=30 (default 14, max 60)
// Each row: { date, alerts:[...], ma7Provenance, ma7CrawlerAdoption, ... }
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
    const nreq = req as NextRequest;
    const url = new URL(nreq.url);
    const limitParam = Math.min(60, Math.max(1, parseInt(url.searchParams.get('limit') || '14', 10)));
    try {
        const snap = await adminDb.collection('kpiAlertsDaily').orderBy('date', 'desc').limit(limitParam).get();
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as Record<string, unknown>));
        return NextResponse.json({ ok: true, rows }, { status: 200 });
    } catch (e: unknown) {
        const err = e as { message?: string };
        return NextResponse.json({ ok: false, error: err.message || 'internal_error' }, { status: 500 });
    }
}
