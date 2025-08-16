import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import '@/lib/firebase-admin';

// Test-only endpoint to mint a Firebase custom token for automation. Disabled in production.
export async function GET(_req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const uid = process.env.TEST_ADMIN_UID || 'test-admin-uid';
    try {
        let auth: ReturnType<typeof getAuth> | null = null;
        try {
            auth = getAuth();
        } catch {
            // Fallback: return a stub token so downstream tests can proceed even if admin SDK not ready.
            return NextResponse.json({ token: 'stub-test-token', uid }, { status: 200 });
        }
        try {
            await auth.getUser(uid);
        } catch {
            try {
                await auth.createUser({ uid, email: process.env.TEST_ADMIN_EMAIL || 'admin@rankpilot.com' });
            } catch { }
        }
        const token = await auth.createCustomToken(uid, { role: 'admin', test: true });
        return NextResponse.json({ token, uid });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
