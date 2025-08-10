import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// Simple invariant helpers
async function getTeamForUser(uid: string) {
    // membership via memberIds
    // Firestore admin SDK uses 'array-contains'
    const teamsSnap = await adminDb.collection("teams").where("memberIds", 'array-contains', uid).limit(1).get();
    if (!teamsSnap.empty) return { id: teamsSnap.docs[0].id, data: teamsSnap.docs[0].data() };
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const teamId = userDoc.exists ? userDoc.data()?.teamId : undefined;
    if (teamId) {
        const teamDoc = await adminDb.collection("teams").doc(teamId).get();
        if (teamDoc.exists) return { id: teamDoc.id, data: teamDoc.data() };
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });
        const token = authHeader.replace("Bearer ", "");
        const decoded = await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const { email, role, message } = body;
        if (!email || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const team = await getTeamForUser(decoded.uid);
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

        const teamData: any = team.data || {};
        const members = Array.isArray(teamData.members) ? [...teamData.members] : [];
        const acting = members.find((m: any) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
        if (!acting || !["owner", "admin"].includes(acting.role)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        if (members.some((m: any) => (m.email || '').toLowerCase() === email.toLowerCase())) {
            return NextResponse.json({ error: "Already a member or invited" }, { status: 409 });
        }

        const newMember = {
            id: email, // deterministic until acceptance
            email,
            role: role === 'owner' ? 'member' : role, // cannot invite as owner directly
            status: 'pending',
            invitedBy: decoded.uid,
            invitedAt: new Date(),
            message: message || null
        };

        members.push(newMember);
        await adminDb.collection("teams").doc(team.id).update({ members });

        // Queue email (best-effort)
        try {
            await adminDb.collection('emailQueue').add({
                to: email,
                template: 'team_invite',
                createdAt: new Date(),
                payload: { inviter: decoded.uid, teamId: team.id, role: newMember.role }
            });
        } catch (e) {
            console.warn('Failed to enqueue invite email', e);
        }
        return NextResponse.json({ success: true, member: newMember });
    } catch (e: any) {
        console.error("Team invite error", e);
        return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
    }
}
