import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getLogger } from '@/lib/logging/app-logger';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TeamMember { userId?: string; id?: string; email?: string; role?: string; status?: string; invitedAt?: unknown; lastActive?: unknown; }
interface TeamDoc { memberIds?: string[]; members?: TeamMember[]; [k: string]: unknown; }

async function getTeam(uid: string): Promise<{ id: string; data: TeamDoc | undefined } | null> {
    const snap = await adminDb.collection('teams').where('memberIds', 'array-contains', uid).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, data: snap.docs[0].data() as TeamDoc };
    const u = await adminDb.collection('users').doc(uid).get();
    const uData = u.exists ? (u.data() as { teamId?: string | undefined }) : undefined;
    const teamId = uData?.teamId;
    if (teamId) {
        const t = await adminDb.collection('teams').doc(teamId).get();
        if (t.exists) return { id: t.id, data: t.data() as TeamDoc };
    }
    return null;
}

export const POST = withProvenance(async function POST(req: NextRequest, context: { params: Promise<{ memberId: string }> }) {
    const logger = getLogger('api.team.member.role');
    const params = await context.params;
    try {
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!authHeader) {
            const body = enforceProvenance({ error: "Missing auth" }, { path: 'team/member/role', note: 'auth' });
            return NextResponse.json(body, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");
        const decoded = await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const role = typeof body?.role === 'string' ? body.role : undefined;
        if (!role) {
            const b = enforceProvenance({ error: 'Missing role' }, { path: 'team/member/role', note: 'input' });
            return NextResponse.json(b, { status: 400 });
        }
        const validRoles = ['owner', 'admin', 'member', 'viewer'] as const;
        if (!(validRoles as readonly string[]).includes(role)) {
            const b = enforceProvenance({ error: 'Invalid role' }, { path: 'team/member/role', note: 'input' });
            return NextResponse.json(b, { status: 400 });
        }

        const team = await getTeam(decoded.uid);
        if (!team) {
            const b = enforceProvenance({ error: 'Team not found' }, { path: 'team/member/role', note: 'not_found' });
            return NextResponse.json(b, { status: 404 });
        }
        const data: TeamDoc = (team.data as TeamDoc) || {};
        const members: TeamMember[] = Array.isArray(data.members) ? [...data.members] : [];

        const acting = members.find((m) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
        const privilegedRoles = ['owner', 'admin'] as const;
        if (!acting || !(privilegedRoles as readonly string[]).includes(acting.role || '')) {
            const b = enforceProvenance({ error: 'Insufficient permissions' }, { path: 'team/member/role', note: 'perm' });
            return NextResponse.json(b, { status: 403 });
        }

        const targetIndex = members.findIndex((m) => m.userId === params.memberId || m.id === params.memberId || m.email === params.memberId);
        if (targetIndex === -1) {
            const b = enforceProvenance({ error: 'Member not found' }, { path: 'team/member/role', note: 'member_not_found' });
            return NextResponse.json(b, { status: 404 });
        }

        const target = members[targetIndex];
        if (target.role === 'owner') {
            const b = enforceProvenance({ error: 'Use transfer ownership flow' }, { path: 'team/member/role', note: 'owner' });
            return NextResponse.json(b, { status: 400 });
        }
        if (role === 'owner') {
            const b = enforceProvenance({ error: 'Cannot promote directly to owner' }, { path: 'team/member/role', note: 'owner_promote' });
            return NextResponse.json(b, { status: 400 });
        }

        members[targetIndex] = { ...target, role };
        await adminDb.collection('teams').doc(team.id).update({ members });
        const ok = enforceProvenance({ success: true }, { path: 'team/member/role', note: 'updated' });
        return NextResponse.json(ok);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Internal error';
        logger.error('member.role.error', { error: msg });
        const b = enforceProvenance({ error: msg }, { path: 'team/member/role', note: 'exception' });
        return NextResponse.json(b, { status: 500 });
    }
}, { path: 'team/member/role' });
