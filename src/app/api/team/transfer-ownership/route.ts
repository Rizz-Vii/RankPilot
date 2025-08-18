import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });
        const token = authHeader.replace("Bearer ", "");
        const decoded = await adminAuth.verifyIdToken(token);

        const { targetMemberId } = await req.json();
        if (!targetMemberId) return NextResponse.json({ error: "Missing targetMemberId" }, { status: 400 });

        const team = await getTeam(decoded.uid);
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
        const data: any = team.data || {};
        const members: any[] = Array.isArray(data.members) ? [...data.members] : [];

        const ownerIndex = members.findIndex((m: any) => m?.role === 'owner' && (m?.userId === decoded.uid || m?.id === decoded.uid || m?.email === decoded.email));
        if (ownerIndex === -1) return NextResponse.json({ error: "Only current owner can transfer" }, { status: 403 });

        const targetIndex = members.findIndex((m: any) => m?.userId === targetMemberId || m?.id === targetMemberId || m?.email === targetMemberId);
        if (targetIndex === -1) return NextResponse.json({ error: "Target member not found" }, { status: 404 });
        if (members[targetIndex]?.role === 'owner') return NextResponse.json({ error: "Target already owner" }, { status: 400 });

        // Perform transfer (retain traceability)
        const prevOwnerId = members[ownerIndex]?.userId || members[ownerIndex]?.id;
        const newOwnerId = members[targetIndex]?.userId || members[targetIndex]?.id;
        members[ownerIndex] = { ...members[ownerIndex], role: 'admin', ownershipTransferredAt: new Date(), transferredTo: newOwnerId };
        members[targetIndex] = { ...members[targetIndex], role: 'owner', ownershipReceivedAt: new Date(), transferredFrom: prevOwnerId };

        await adminDb.collection("teams").doc(team.id).update({ members });

        await adminDb.collection("teamAuditLogs").add({
            teamId: team.id,
            type: 'ownership_transfer',
            from: prevOwnerId,
            to: newOwnerId,
            at: new Date()
        });

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        console.error("Transfer ownership error", e);
        return NextResponse.json({ error: (e as any)?.message || 'Internal error' }, { status: 500 });
    }
}
