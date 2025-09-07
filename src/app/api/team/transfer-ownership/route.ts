import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

type DecodedToken = { uid: string; email?: string | null };

async function getTeam(
  uid: string
): Promise<{ id: string; data: unknown } | null> {
  const snap = await adminDb
    .collection("teams")
    .where("memberIds", "array-contains", uid)
    .limit(1)
    .get();
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
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const decoded = (await adminAuth.verifyIdToken(token)) as DecodedToken;

    const body = (await req.json()) as { targetMemberId?: string };
    const { targetMemberId } = body;
    if (!targetMemberId)
      return NextResponse.json(
        { error: "Missing targetMemberId" },
        { status: 400 }
      );

    const team = await getTeam(decoded.uid);
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const data = (team.data ?? {}) as Record<string, unknown>;
    const membersData = data.members;
    const members = Array.isArray(membersData)
      ? [...(membersData as unknown[])]
      : [];

    const ownerIndex = members.findIndex((m: unknown) => {
      const mm = m as Record<string, unknown>;
      const role = mm.role as string | undefined;
      const memberUserId = (mm.userId ?? mm.id) as string | undefined;
      const memberEmail = mm.email as string | undefined;
      return (
        role === "owner" &&
        (memberUserId === decoded.uid || memberEmail === decoded.email)
      );
    });
    if (ownerIndex === -1)
      return NextResponse.json(
        { error: "Only current owner can transfer" },
        { status: 403 }
      );

    const targetIndex = members.findIndex((m: unknown) => {
      const mm = m as Record<string, unknown>;
      const memberUserId = (mm.userId ?? mm.id) as string | undefined;
      const memberEmail = mm.email as string | undefined;
      return memberUserId === targetMemberId || memberEmail === targetMemberId;
    });
    if (targetIndex === -1)
      return NextResponse.json(
        { error: "Target member not found" },
        { status: 404 }
      );

    const targetRole = (members[targetIndex] as Record<string, unknown>)
      .role as string | undefined;
    if (targetRole === "owner")
      return NextResponse.json(
        { error: "Target already owner" },
        { status: 400 }
      );

    // Perform transfer (retain traceability)
    const prevOwnerId = ((members[ownerIndex] as Record<string, unknown>)
      .userId ?? (members[ownerIndex] as Record<string, unknown>).id) as
      | string
      | undefined;
    const newOwnerId = ((members[targetIndex] as Record<string, unknown>)
      .userId ?? (members[targetIndex] as Record<string, unknown>).id) as
      | string
      | undefined;

    members[ownerIndex] = {
      ...(members[ownerIndex] as Record<string, unknown>),
      role: "admin",
      ownershipTransferredAt: new Date().toISOString(),
      transferredTo: newOwnerId,
    };
    members[targetIndex] = {
      ...(members[targetIndex] as Record<string, unknown>),
      role: "owner",
      ownershipReceivedAt: new Date().toISOString(),
      transferredFrom: prevOwnerId,
    };

    await adminDb.collection("teams").doc(team.id).update({ members });

    await adminDb.collection("teamAuditLogs").add({
      teamId: team.id,
      type: "ownership_transfer",
      from: prevOwnerId,
      to: newOwnerId,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("Transfer ownership error", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: message || "Internal error" },
      { status: 500 }
    );
  }
}
