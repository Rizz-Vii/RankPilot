import { adminDb } from '@/lib/firebase-admin';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
    try {
        // Return a few most recent voice_calls for dev diagnostics
        if (!adminDb) return NextResponse.json({ calls: [] });
        const snap = await adminDb.collection('voice_calls').orderBy('createdAt', 'desc').limit(5).get();
        const calls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return NextResponse.json({ calls });
    } catch (e) {
        return NextResponse.json({ calls: [], error: String(e) }, { status: 200 });
    }
}
