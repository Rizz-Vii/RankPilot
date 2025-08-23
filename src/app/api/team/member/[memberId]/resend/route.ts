import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getLogger } from '@/lib/logging/app-logger';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface TeamMember { userId?: string; id?: string; email?: string; role?: string; status?: string; invitedAt?: unknown; lastActive?: unknown; }
interface TeamDoc { memberIds?: string[]; members?: TeamMember[];[k: string]: unknown; }

async function getTeam(uid: string): Promise<{ id: string; data: TeamDoc } | null> {
    const snap = await adminDb.collection('teams').where('memberIds', 'array-contains', uid).limit(1).get();
    if (!snap.empty) {
        return { id: snap.docs[0].id, data: snap.docs[0].data() as TeamDoc };
    }
    const u = await adminDb.collection('users').doc(uid).get();
    const teamId = u.exists ? u.data()?.teamId : undefined;
    if (teamId) {
        const t = await adminDb.collection('teams').doc(teamId).get();
        if (t.exists) return { id: t.id, data: t.data() as TeamDoc };
    }
    return null;
}

// Next.js generated types (in .next/types) currently expect RouteContext.params to be a Promise.
// We accept either a direct object (runtime) or a Promise (type expectation) and normalize.
export const POST = withProvenance(async function POST(req: NextRequest, context: { params: Promise<{ memberId: string }> }) {
    const logger = getLogger('api.team.member.resend');
    const params = await context.params; // Next types expect a Promise; awaiting a plain object is fine.
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            const b = enforceProvenance({ error: 'Missing auth' }, { path: 'team/member/resend', note: 'auth' });
            return NextResponse.json(b, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const decoded = await adminAuth.verifyIdToken(token);

        const team = await getTeam(decoded.uid);
        if (!team) {
            const b = enforceProvenance({ error: 'Team not found' }, { path: 'team/member/resend', note: 'not_found' });
            return NextResponse.json(b, { status: 404 });
        }
        const data: TeamDoc = (team.data as TeamDoc) || {};
        const members: TeamMember[] = Array.isArray(data.members) ? [...data.members] : [];

        const acting = members.find((m) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
        if (!acting || !['owner', 'admin'].includes(acting.role || '')) {
            const b = enforceProvenance({ error: 'Insufficient permissions' }, { path: 'team/member/resend', note: 'perm' });
            return NextResponse.json(b, { status: 403 });
        }

        const target = members.find((m) => m.userId === params.memberId || m.id === params.memberId || m.email === params.memberId);
        if (!target) {
            const b = enforceProvenance({ error: 'Member not found' }, { path: 'team/member/resend', note: 'member_not_found' });
            return NextResponse.json(b, { status: 404 });
        }
        if (target.status !== 'pending') {
            const b = enforceProvenance({ error: 'Member not pending' }, { path: 'team/member/resend', note: 'status' });
            return NextResponse.json(b, { status: 400 });
        }

        // Simple cooldown enforcement using invitedAt timestamp
        const now = Date.now();
        const invitedAtValue = target.invitedAt ?? Date.now() - 60000;
        const invitedAtTs = (invitedAtValue && typeof (invitedAtValue as { toMillis?: unknown })?.toMillis === 'function')
            ? (invitedAtValue as { toMillis: () => number }).toMillis()
            : (typeof invitedAtValue === 'number' ? invitedAtValue : new Date(String(invitedAtValue)).getTime());
        if (now - invitedAtTs < 60_000) {
            const b = enforceProvenance({ error: 'Please wait before resending' }, { path: 'team/member/resend', note: 'cooldown' });
            return NextResponse.json(b, { status: 429 });
        }

        // Update invitedAt & queue email
        target.invitedAt = new Date();
        await adminDb.collection('teams').doc(team.id).update({ members });
        try {
            if (target.email) {
                await adminDb.collection('emailQueue').add({
                    to: target.email,
                    template: 'team_invite_resend',
                    createdAt: new Date(),
                    payload: { teamId: team.id, role: target.role },
                });
            } else {
                logger.warn('resend.skip_no_email', { memberId: params.memberId });
            }
        } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn('resend.enqueue.error', { error: msg });
        }
        const ok = enforceProvenance({ success: true }, { path: 'team/member/resend', note: 'ok' });
        return NextResponse.json(ok);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Internal error';
        logger.error('resend.error', { error: msg });
        const b = enforceProvenance({ error: msg }, { path: 'team/member/resend', note: 'exception' });
        return NextResponse.json(b, { status: 500 });
    }
}, { path: 'team/member/resend' });
