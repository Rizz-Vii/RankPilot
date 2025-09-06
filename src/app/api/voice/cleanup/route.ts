import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// lazy load cleanup util
let cleanup: null | ((args: { limit?: number }) => Promise<unknown>) = null;
void import('../../../../lib/voice/holds-cleanup').then(mod => {
    // @ts-ignore optional
    cleanup = (mod as { cleanupExpiredHolds?: typeof cleanup }).cleanupExpiredHolds || null;
}).catch(() => { /* ignore */ });

export async function POST(req: NextRequest) {
    try {
        if (!cleanup) return NextResponse.json({ ok: false, reason: 'not_available' }, { status: 500 });
        const body = await req.json().catch(() => ({}));
        const limit = typeof body?.limit === 'number' ? body.limit : 100;
        const res = await cleanup({ limit });
        return NextResponse.json(res);
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
