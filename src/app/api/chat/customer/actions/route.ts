import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Persists action checklist progress for a chat session.
// Expects: Authorization: Bearer <idToken>
// POST /api/chat/customer/actions?sessionId=xyz
// Body: { "progress": { "actionId": true/false, ... } }
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Auth required' }, { status: 401 });
        }
        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const progress = body?.progress || {};
        if (typeof progress !== 'object' || Array.isArray(progress)) {
            return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 });
        }

        const sessionRef = adminDb
            .collection('chatLogs')
            .doc(uid)
            .collection('sessions')
            .doc(sessionId);

        // Fetch current pendingActions for analytics
        const sessionSnap = await sessionRef.get();
        const sData = sessionSnap.exists ? (sessionSnap.data() as any) : {};
        const pendingActions: string[] = Array.isArray(sData?.pendingActions) ? sData.pendingActions : [];
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

        return NextResponse.json({ success: true, actionStats: { totalCompleted, totalPending, completionRate } });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message || 'Failed to update actions' },
            { status: 500 }
        );
    }
}
