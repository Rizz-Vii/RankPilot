import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface TeamMember { userId?: string; id?: string; email?: string; role?: string; status?: string; invitedAt?: unknown; lastActive?: unknown; }
interface TeamDoc { memberIds?: string[]; members?: TeamMember[]; [k: string]: unknown; }

async function getTeam(uid: string): Promise<{ id: string; data: TeamDoc | undefined } | null> {
    const snap = await adminDb.collection('teams').where('memberIds', 'array-contains', uid).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, data: snap.docs[0].data() as TeamDoc };
    const u = await adminDb.collection('users').doc(uid).get();
    const teamId = u.exists ? (u.data() as any)?.teamId : undefined;
    if (teamId) {
        const t = await adminDb.collection('teams').doc(teamId).get();
        if (t.exists) return { id: t.id, data: t.data() as TeamDoc };
    }
    return null;
}

export const POST: (req: NextRequest, context: { params: Promise<{ memberId: string }> }) => Promise<NextResponse> = async (req, context) => {
    const params = await context.params;
    try {
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });
        const token = authHeader.replace("Bearer ", "");
        const decoded = await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const role = typeof body?.role === 'string' ? body.role : undefined;
        if (!role) return NextResponse.json({ error: 'Missing role' }, { status: 400 });
        const validRoles = ['owner', 'admin', 'member', 'viewer'] as const;
        if (!(validRoles as readonly string[]).includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const team = await getTeam(decoded.uid);
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        const data: TeamDoc = (team.data as TeamDoc) || {};
        const members: TeamMember[] = Array.isArray(data.members) ? [...data.members] : [];

        const acting = members.find((m) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
        const privilegedRoles = ['owner', 'admin'] as const;
        if (!acting || !(privilegedRoles as readonly string[]).includes(acting.role || '')) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const targetIndex = members.findIndex((m) => m.userId === params.memberId || m.id === params.memberId || m.email === params.memberId);
        if (targetIndex === -1) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        const target = members[targetIndex];
        if (target.role === 'owner') {
            return NextResponse.json({ error: 'Use transfer ownership flow' }, { status: 400 });
        }
        if (role === 'owner') {
            return NextResponse.json({ error: 'Cannot promote directly to owner' }, { status: 400 });
        }

        members[targetIndex] = { ...target, role };
        await adminDb.collection('teams').doc(team.id).update({ members });
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error('Role update error', err);
        const msg = err instanceof Error ? err.message : 'Internal error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
};
