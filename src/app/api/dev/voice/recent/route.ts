import { adminDb } from '@/lib/firebase-admin';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const bad = (status: number, error: string) => NextResponse.json({ error }, { status });
const ok = (data: unknown) => NextResponse.json(data, { status: 200 });

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    // Gate with probe token outside local dev
    if (process.env.NODE_ENV === 'production') {
        const probe = req.headers.get('x-probe-token');
        if (!probe || probe !== process.env.CRAWL_PROBE_TOKEN) return bad(403, 'forbidden');
    }
    try {
        const snap = await adminDb
            .collection('voice_calls')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return ok({ items });
    } catch (e) {
        return bad(500, e instanceof Error ? e.message : String(e));
    }
}
