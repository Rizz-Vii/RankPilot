import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

interface TeamMember { userId?: string; id?: string; email?: string; role?: string; status?: string; invitedAt?: any; lastActive?: any; }
interface TeamDoc { memberIds?: string[]; members?: TeamMember[];[k: string]: unknown; }

async function getTeam(uid: string) {
    const snap = await adminDb.collection("teams").where("memberIds", 'array-contains', uid).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, data: snap.docs[0].data() };
    const u = await adminDb.collection("users").doc(uid).get();
    const teamId = u.exists ? u.data()?.teamId : undefined;
    if (teamId) {
        const t = await adminDb.collection("teams").doc(teamId).get();
        if (t.exists) return { id: t.id, data: t.data() };
    }
    return null;
}

interface RouteContext { params: { memberId: string } }
export async function DELETE(req: NextRequest, context: RouteContext) {
    const { params } = context;
    try {
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });
        const token = authHeader.replace("Bearer ", "");
        const decoded = await adminAuth.verifyIdToken(token);

        const team = await getTeam(decoded.uid);
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

        const data: TeamDoc = (team.data as TeamDoc) || {};
        const members: TeamMember[] = Array.isArray(data.members) ? [...data.members] : [];
        const acting = members.find((m) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
        if (!acting || !['owner', 'admin'].includes(acting.role || '')) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const targetIndex = members.findIndex((m) => m.userId === params.memberId || m.id === params.memberId || m.email === params.memberId);
        if (targetIndex === -1) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        const target = members[targetIndex];

        if (target.role === 'owner') {
            return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
        }

        if (target.role === 'admin') {
            const adminCount = members.filter((m) => m.role === 'admin').length;
            if (adminCount <= 1) {
                return NextResponse.json({ error: "Cannot remove last admin" }, { status: 400 });
            }
        }

        members.splice(targetIndex, 1);
        await adminDb.collection("teams").doc(team.id).update({ members });
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        console.error("Remove member error", e);
        const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Internal error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
