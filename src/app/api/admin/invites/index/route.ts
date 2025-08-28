import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Ensure Node.js runtime and disable static optimization for this dev/test admin route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TeamMember {
  userId?: string;
  id?: string;
  email?: string;
  role?: 'owner' | 'admin' | string;
}

interface TeamData {
  members?: TeamMember[];
  memberIds?: string[];
}

// Admin-only (owner role) DEV/TEST endpoint: delete an invites_index doc to exercise backfill path.
// Disabled automatically in production.
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Disabled' }, { status: 403 });
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(authHeader.replace('Bearer ', ''));
        // Minimal role check: ensure user is on a team and is owner/admin
        const teamSnap = await adminDb.collection('teams').where('memberIds', 'array-contains', decoded.uid).limit(1).get();
        if (teamSnap.empty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const teamDoc = teamSnap.docs[0];
        const teamData = teamDoc.data() as TeamData;
        const acting = (teamData?.members || []).find((m?: TeamMember) => m?.userId === decoded.uid || m?.id === decoded.uid || m?.email === decoded.email);
        if (!acting || !['owner', 'admin'].includes(acting.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const inviteId = searchParams.get('inviteId');
        if (!inviteId) return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
        await adminDb.collection('invites_index').doc(inviteId).delete();
        return NextResponse.json({ success: true, inviteId, action: 'index_deleted' });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg || 'Internal error' }, { status: 500 });
    }
}
