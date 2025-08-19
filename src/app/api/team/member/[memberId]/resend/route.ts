import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

// Next.js generated types (in .next/types) currently expect RouteContext.params to be a Promise.
// We accept either a direct object (runtime) or a Promise (type expectation) and normalize.
export const POST: (req: NextRequest, context: { params: Promise<{ memberId: string }> }) => Promise<NextResponse> = async (req, context) => {
    const params = await context.params; // Next types expect a Promise; awaiting a plain object is fine.
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

        const target = members.find((m) => m.userId === params.memberId || m.id === params.memberId || m.email === params.memberId);
        if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        if (target.status !== 'pending') return NextResponse.json({ error: "Member not pending" }, { status: 400 });

        // Simple cooldown enforcement using invitedAt timestamp
        const now = Date.now();
        const invitedAtTs = (target.invitedAt && target.invitedAt.toMillis) ? target.invitedAt.toMillis() : new Date(target.invitedAt || Date.now() - 60000).getTime();
        if (now - invitedAtTs < 60_000) {
            return NextResponse.json({ error: "Please wait before resending" }, { status: 429 });
        }

        // Update invitedAt & queue email
        target.invitedAt = new Date();
        await adminDb.collection("teams").doc(team.id).update({ members });
        try {
            await adminDb.collection('emailQueue').add({
                to: target.email,
                template: 'team_invite_resend',
                createdAt: new Date(),
                payload: { teamId: team.id, role: target.role }
            });
        } catch (e) {
            console.warn('Failed to enqueue resend email', e);
        }
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        console.error("Resend invite error", e);
        const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Internal error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
};
