import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Health Alerts History API
// Returns recent persisted alert snapshots from kpiAlertsDaily (newest first).
// Query params: ?limit=30 (default 14, max 60)
// Each row: { date, alerts:[...], ma7Provenance, ma7CrawlerAdoption, ... }
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const limitParam = Math.min(60, Math.max(1, parseInt(url.searchParams.get('limit') || '14', 10)));
    try {
        const snap = await adminDb.collection('kpiAlertsDaily').orderBy('date', 'desc').limit(limitParam).get();
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        return NextResponse.json({ ok: true, rows }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || 'internal_error' }, { status: 500 });
    }
}
