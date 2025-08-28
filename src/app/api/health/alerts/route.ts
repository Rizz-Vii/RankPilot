import { adminDb } from '@/lib/firebase-admin';
import { enforceProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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
        return NextResponse.json(enforceProvenance({ ok: true, rows }, { path: 'health/alerts' }), { status: 200 });
    } catch (e: unknown) {
        const err = e as { message?: string };
        return NextResponse.json(enforceProvenance({ ok: false, error: err.message || 'internal_error' }, { path: 'health/alerts', note: 'error' }), { status: 500 });
    }
}
