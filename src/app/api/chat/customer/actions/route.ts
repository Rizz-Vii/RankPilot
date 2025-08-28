import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Persists action checklist progress for a chat session.
// Expects: Authorization: Bearer <idToken>
// POST /api/chat/customer/actions?sessionId=xyz
// Body: { "progress": { "actionId": true/false, ... } }
export const POST = withProvenance(async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Auth required' }, { path: 'chat/customer/actions', note: 'auth' }), { status: 401 });
        }
        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        if (!sessionId) {
            return NextResponse.json(enforceProvenance({ error: 'sessionId required' }, { path: 'chat/customer/actions', note: 'validation' }), { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const progress = body?.progress || {};
        if (typeof progress !== 'object' || Array.isArray(progress)) {
            return NextResponse.json(enforceProvenance({ error: 'Invalid progress payload' }, { path: 'chat/customer/actions', note: 'validation' }), { status: 400 });
        }
        // Forbidden-field guard: disallow client attempts to set server-managed fields
        const forbidden = ['__provenance', 'provenance', 'updatedAt', 'actionStats'];
        for (const k of Object.keys(progress)) {
            if (forbidden.includes(k)) {
                return NextResponse.json(
                    enforceProvenance({ error: `Field not allowed: ${k}` }, { path: 'chat/customer/actions', note: 'forbidden-field' }),
                    { status: 400 }
                );
            }
        }

        const sessionRef = adminDb
            .collection('chatLogs')
            .doc(uid)
            .collection('sessions')
            .doc(sessionId);

        // Fetch current pendingActions for analytics
        const sessionSnap = await sessionRef.get();
        interface SessionData { pendingActions?: unknown[] }
        const sData: SessionData = sessionSnap.exists ? (sessionSnap.data() as SessionData) : {};
        const pendingActions: string[] = Array.isArray(sData.pendingActions) ? (sData.pendingActions as string[]) : [];
        const totalCompleted = Object.values(progress).filter(v => !!v).length;
        const totalPending = pendingActions.length;
        const denominator = totalCompleted + totalPending;
        const completionRate = denominator === 0 ? (totalCompleted > 0 ? 1 : 0) : totalCompleted / denominator;

        await sessionRef.set(
            {
                actionProgress: progress,
                actionProgressUpdatedAt: new Date(),
                actionStats: {
                    totalCompleted,
                    totalPending,
                    completionRate,
                    updatedAt: new Date(),
                },
            },
            { merge: true }
        );

        return NextResponse.json(enforceProvenance({ success: true, actionStats: { totalCompleted, totalPending, completionRate } }, { path: 'chat/customer/actions', note: 'ok' }));
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json(
            enforceProvenance({ error: message || 'Failed to update actions' }, { path: 'chat/customer/actions', note: 'exception' }),
            { status: 500 }
        );
    }
});
