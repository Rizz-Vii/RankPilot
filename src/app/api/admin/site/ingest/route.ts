import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { ingestSiteContentForOrg } from '@/lib/site-ingestion/crawler-ingest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(token);
        if (!(decoded?.admin || decoded?.role === 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const body = await req.json().catch(() => ({}));
        const baseUrl: string = body.baseUrl;
        const maxPages: number | undefined = body.maxPages;
        if (!baseUrl) return NextResponse.json({ error: 'baseUrl required' }, { status: 400 });
        const result = await ingestSiteContentForOrg(decoded.uid, { baseUrl, maxPages });
        return NextResponse.json({ success: true, ...result });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Ingestion failed' }, { status: 500 });
    }
}
