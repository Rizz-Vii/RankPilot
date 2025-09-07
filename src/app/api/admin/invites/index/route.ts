import { adminDb } from '@/lib/firebase-admin';
import { withAdmin } from '@/lib/middleware/with-admin';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
export const DELETE = withAdmin(async (req: NextRequest, { uid, email }) => {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Disabled' }, { status: 403 });
  // Minimal role check: ensure user is on a team and is owner/admin
  const teamSnap = await adminDb.collection('teams').where('memberIds', 'array-contains', uid).limit(1).get();
  if (teamSnap.empty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const teamDoc = teamSnap.docs[0];
  const teamData = teamDoc.data() as TeamData;
  const acting = (teamData?.members || []).find((m?: TeamMember) => m?.userId === uid || m?.id === uid || (email && m?.email === email));
  if (!acting || !['owner', 'admin'].includes(acting.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get('inviteId');
  if (!inviteId) return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
  await adminDb.collection('invites_index').doc(inviteId).delete();
  return NextResponse.json({ success: true, inviteId, action: 'index_deleted' });
}, { path: 'admin/invites/index' });
