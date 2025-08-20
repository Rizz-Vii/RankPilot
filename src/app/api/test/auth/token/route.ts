import { NextResponse } from 'next/server';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';
import { getServerSession } from 'next-auth';

// Non-production only endpoint to fetch current session user basic info (ID token not always accessible server-side)
export const GET = withProvenance(async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'disabled' }, { status: 404 });
    }
    try {
        const session = await getServerSession().catch(() => null);
        if (!session || !(session as any).user) {
            const noSessionBody = enforceProvenance(
                { error: 'not_authenticated' },
                { path: 'test/auth/token', note: 'no_session' }
            );
            return NextResponse.json(noSessionBody, { status: 401 });
        }
        const okBody = enforceProvenance(
            { user: (session as any).user },
            { path: 'test/auth/token', note: 'ok' }
        );
        return NextResponse.json(okBody);
    } catch (e: unknown) {
        const errBody = enforceProvenance(
            { error: 'internal_error', message: (e as any)?.message },
            { path: 'test/auth/token', note: 'exception' }
        );
        return NextResponse.json(errBody, { status: 500 });
    }
}, { path: 'test/auth/token' });
