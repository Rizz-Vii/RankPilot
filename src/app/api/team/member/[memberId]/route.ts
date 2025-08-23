import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getLogger } from '@/lib/logging/app-logger';
import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface TeamMember { userId?: string; id?: string; email?: string; role?: string; status?: string; invitedAt?: unknown; lastActive?: unknown; }
interface TeamDoc { memberIds?: string[]; members?: TeamMember[];[k: string]: unknown; }

async function getTeam(uid: string): Promise<{ id: string; data: TeamDoc } | null> {
    const snap = await adminDb.collection("teams").where("memberIds", 'array-contains', uid).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, data: snap.docs[0].data() as TeamDoc };
    const u = await adminDb.collection("users").doc(uid).get();
    const uData = u.exists ? (u.data() as { teamId?: string }) : undefined;
    const teamId = uData?.teamId;
    if (teamId) {
        const t = await adminDb.collection("teams").doc(teamId).get();
        if (t.exists) return { id: t.id, data: t.data() as TeamDoc };
    }
    return null;
}

export const DELETE = withProvenance(async function DELETE(req: NextRequest, context: { params: Promise<{ memberId: string }> }) {
    const logger = getLogger('api.team.member.delete');
    const params = await context.params;
    try {
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!authHeader) {
            const missingAuthBody = enforceProvenance({ error: "Missing auth" }, { path: 'team/member', note: 'auth' });
            return NextResponse.json(missingAuthBody, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const decoded = await adminAuth.verifyIdToken(token) as { uid: string; email?: string | undefined; };

        const team = await getTeam(decoded.uid);
        if (!team) {
            const notFoundBody = enforceProvenance({ error: "Team not found" }, { path: 'team/member', note: 'not_found' });
            return NextResponse.json(notFoundBody, { status: 404 });
        }

        const data: TeamDoc = (team.data as TeamDoc) || {};
        const members: TeamMember[] = Array.isArray(data.members) ? [...data.members] : [];
        const acting = members.find((m) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
        if (!acting || !['owner', 'admin'].includes(acting.role || '')) {
            const permBody = enforceProvenance({ error: "Insufficient permissions" }, { path: 'team/member', note: 'perm' });
            return NextResponse.json(permBody, { status: 403 });
        }

        const targetIndex = members.findIndex((m) => m.userId === params.memberId || m.id === params.memberId || m.email === params.memberId);
        if (targetIndex === -1) {
            const memNotFoundBody = enforceProvenance({ error: "Member not found" }, { path: 'team/member', note: 'member_not_found' });
            return NextResponse.json(memNotFoundBody, { status: 404 });
        }
        const target = members[targetIndex];

        if (target.role === 'owner') {
            const ownerBody = enforceProvenance({ error: "Cannot remove owner" }, { path: 'team/member', note: 'owner' });
            return NextResponse.json(ownerBody, { status: 400 });
        }

        if (target.role === 'admin') {
            const adminCount = members.filter((m) => m.role === 'admin').length;
            if (adminCount <= 1) {
                const lastAdminBody = enforceProvenance({ error: "Cannot remove last admin" }, { path: 'team/member', note: 'last_admin' });
                return NextResponse.json(lastAdminBody, { status: 400 });
            }
        }

        members.splice(targetIndex, 1);
        await adminDb.collection("teams").doc(team.id).update({ members });
        const okBody = enforceProvenance({ success: true }, { path: 'team/member', note: 'removed' });
        return NextResponse.json(okBody);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('member.remove.error', { error: msg });
        const errBody = enforceProvenance({ error: msg }, { path: 'team/member', note: 'exception' });
        return NextResponse.json(errBody, { status: 500 });
    }
}, { path: 'team/member', note: 'delete' });
