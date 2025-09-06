import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dev-only diagnostics endpoint: validates current user Firestore read access for key collections
// Returns status per collection; avoid exposing data (only sizes / error codes)
export async function GET() {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }
    const targets = [
        'financeInvoices',
        'marketingCampaigns',
        'salesDeals',
        'contentBriefs',
        'seoAudits',
        'neuroSeoAnalyses',
        'linkAnalyses'
    ];
    const results: Record<string, unknown> = {};
    for (const colName of targets) {
        try {
            const snap = await adminDb.collection(colName).limit(1).get();
            results[colName] = { ok: true, count: snap.size };
        } catch (e: unknown) {
            const code = ((): string => {
                if (e && typeof e === 'object') {
                    const rec = e as Record<string, unknown>;
                    if (typeof rec.code === 'string') return rec.code;
                    if (typeof rec.message === 'string') return rec.message;
                }
                return 'unknown_error';
            })();
            results[colName] = { ok: false, error: code };
        }
    }
    return NextResponse.json({ ts: new Date().toISOString(), results });
}
