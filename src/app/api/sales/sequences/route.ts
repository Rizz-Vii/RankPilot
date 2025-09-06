import { canAccessFeature, normalizeUserAccess } from "@/lib/access-control";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getLogger } from "@/lib/logging/app-logger";
import { getUserTeamContext, isTeamAdmin } from "@/lib/team/team-access";
import type { SalesSequenceDoc } from "@/types/sales";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function bad(status: number, error: string) {
    return NextResponse.json({ error }, { status });
}

function ok(data: unknown, init?: number) {
    return NextResponse.json(data as Record<string, unknown>, { status: init ?? 200 });
}

async function requireUser(req: NextRequest) {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!auth) throw Object.assign(new Error("Missing auth"), { status: 401 });
    const token = auth.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded as { uid?: string; email?: string;[k: string]: unknown };
}

async function requireSalesAccess(uid: string) {
    const teamCtx = await getUserTeamContext(uid);
    const profileSnap = await adminDb.collection("users").doc(uid).get();
    const ua = normalizeUserAccess((profileSnap.exists ? profileSnap.data() : {}) || {});
    // Team plan can elevate effective tier; here we check feature strictly
    const allowed = canAccessFeature(ua, "sales_outreach");
    return { teamCtx, ua, allowed } as const;
}

// GET: list sequences for user's team
export async function GET(req: NextRequest) {
    const logger = getLogger("api.sales.sequences");
    try {
        const user = await requireUser(req);
        const uid = String(user.uid || "");
        const { teamCtx, allowed } = await requireSalesAccess(uid);
        if (!allowed) return bad(403, "forbidden");
        const teamId = teamCtx.team?.id;
        if (!teamId) return ok({ sequences: [] });
        const snap = await adminDb.collection("teams").doc(teamId).collection("salesSequences").orderBy("createdAt", "desc").limit(50).get();
        const sequences = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return ok({ sequences });
    } catch (e: unknown) {
        const status = (e && typeof e === 'object' && 'status' in e && typeof (e as { status?: unknown }).status === 'number')
            ? (e as { status: number }).status
            : 500;
        const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : String(e);
        logger.error("list_failed", { error: msg });
        return bad(status, status === 401 ? "unauthorized" : "internal_error");
    }
}

// POST: create sequence
export async function POST(req: NextRequest) {
    const logger = getLogger("api.sales.sequences");
    try {
        const user = await requireUser(req);
        const uid = String(user.uid || "");
        const { teamCtx, allowed } = await requireSalesAccess(uid);
        if (!allowed) return bad(403, "forbidden");
        if (!teamCtx.team) return bad(400, "no_team");
        const memberIsAdmin = isTeamAdmin(teamCtx.membership);

        const body = (await req.json().catch(() => ({}))) as Partial<SalesSequenceDoc> & { name?: string };
        const name = body?.name?.trim();
        if (!name) return bad(400, "name_required");
        const steps = Array.isArray(body.steps) ? body.steps : [];
        const targets = Array.isArray(body.targets) ? body.targets : [];
        if (steps.length === 0) return bad(400, "steps_required");
        if (targets.length === 0) return bad(400, "targets_required");
        if (!memberIsAdmin) return bad(403, "admin_required");

        const now = new Date();
        const doc: SalesSequenceDoc = {
            name,
            description: body.description || "",
            createdAt: now,
            createdBy: uid,
            status: (body.status === "active" || body.status === "paused" || body.status === "archived") ? body.status : "draft",
            steps,
            targets,
            schedule: body.schedule || null,
        };
        const ref = await adminDb.collection("teams").doc(teamCtx.team.id).collection("salesSequences").add(doc);
        logger.info("created", { teamId: teamCtx.team.id, sequenceId: ref.id });
        return ok({ id: ref.id, ...doc }, 201);
    } catch (e: unknown) {
        const status = (e && typeof e === 'object' && 'status' in e && typeof (e as { status?: unknown }).status === 'number')
            ? (e as { status: number }).status
            : 500;
        const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : String(e);
        logger.error("create_failed", { error: msg });
        return bad(status, status === 401 ? "unauthorized" : "internal_error");
    }
}

// PATCH: update sequence (name, status, steps, targets, schedule)
export async function PATCH(req: NextRequest) {
    const logger = getLogger("api.sales.sequences");
    try {
        const user = await requireUser(req);
        const uid = String(user.uid || "");
        const { teamCtx, allowed } = await requireSalesAccess(uid);
        if (!allowed) return bad(403, "forbidden");
        if (!teamCtx.team) return bad(400, "no_team");
        if (!isTeamAdmin(teamCtx.membership)) return bad(403, "admin_required");

        const body = (await req.json().catch(() => ({}))) as Partial<SalesSequenceDoc> & { id?: string };
        const id = body.id;
        if (!id) return bad(400, "id_required");
        const update: Record<string, unknown> = {};
        if (typeof body.name === "string") update.name = body.name.trim();
        if (typeof body.description === "string") update.description = body.description;
        if (body.status && ["draft", "active", "paused", "archived"].includes(body.status)) update.status = body.status;
        if (Array.isArray(body.steps)) update.steps = body.steps;
        if (Array.isArray(body.targets)) update.targets = body.targets;
        if (body.schedule !== undefined) update.schedule = body.schedule;
        if (Object.keys(update).length === 0) return bad(400, "no_fields");
        await adminDb.collection("teams").doc(teamCtx.team.id).collection("salesSequences").doc(id).set(update, { merge: true });
        logger.info("updated", { id });
        return ok({ success: true });
    } catch (e: unknown) {
        const status = (e && typeof e === 'object' && 'status' in e && typeof (e as { status?: unknown }).status === 'number')
            ? (e as { status: number }).status
            : 500;
        const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : String(e);
        logger.error("update_failed", { error: msg });
        return bad(status, status === 401 ? "unauthorized" : "internal_error");
    }
}

// DELETE: delete sequence
export async function DELETE(req: NextRequest) {
    const logger = getLogger("api.sales.sequences");
    try {
        const user = await requireUser(req);
        const uid = String(user.uid || "");
        const { teamCtx, allowed } = await requireSalesAccess(uid);
        if (!allowed) return bad(403, "forbidden");
        if (!teamCtx.team) return bad(400, "no_team");
        if (!isTeamAdmin(teamCtx.membership)) return bad(403, "admin_required");
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) return bad(400, "id_required");
        await adminDb.collection("teams").doc(teamCtx.team.id).collection("salesSequences").doc(id).delete();
        logger.info("deleted", { id });
        return ok({ success: true });
    } catch (e: unknown) {
        const status = (e && typeof e === 'object' && 'status' in e && typeof (e as { status?: unknown }).status === 'number')
            ? (e as { status: number }).status
            : 500;
        const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : String(e);
        logger.error("delete_failed", { error: msg });
        return bad(status, status === 401 ? "unauthorized" : "internal_error");
    }
}
