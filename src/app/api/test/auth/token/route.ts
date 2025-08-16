import { NextRequest, NextResponse } from 'next/server';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';
import { getServerSession } from 'next-auth';

// Non-production only endpoint to fetch current session user basic info (ID token not always accessible server-side)
export const GET = withProvenance(async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'disabled' }, { status: 404 });
    }
    try {
        const session = await getServerSession().catch(() => null);
        if (!session || !(session as any).user) {
            return NextResponse.json(enforceProvenance({ error: 'not_authenticated' }, { path: 'test/auth/token', note: 'no_session' }), { status: 401 });
        }
        return NextResponse.json(enforceProvenance({ user: (session as any).user }, { path: 'test/auth/token', note: 'ok' }));
    } catch (e: any) {
        return NextResponse.json(enforceProvenance({ error: 'internal_error', message: e?.message }, { path: 'test/auth/token', note: 'exception' }), { status: 500 });
    }
}, { path: 'test/auth/token' });
