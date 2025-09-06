import { canAccessFeature, normalizeUserAccess } from "@/lib/access-control";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getLogger } from "@/lib/logging/app-logger";
import { getUserTeamContext, isTeamAdmin } from "@/lib/team/team-access";
import type { SalesExecutionDoc, SalesExecutionResult, SalesSequenceDoc } from "@/types/sales";
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
    return decoded as { uid?: string };
}

export async function POST(req: NextRequest) {
    const logger = getLogger("api.sales.sequences.run");
    try {
        const user = await requireUser(req);
        const uid = String(user.uid || "");
        const profileSnap = await adminDb.collection("users").doc(uid).get();
        const ua = normalizeUserAccess((profileSnap.exists ? profileSnap.data() : {}) || {});
        if (!canAccessFeature(ua, "sales_outreach")) return bad(403, "forbidden");
        const teamCtx = await getUserTeamContext(uid);
        if (!teamCtx.team) return bad(400, "no_team");
        if (!isTeamAdmin(teamCtx.membership)) return bad(403, "admin_required");

        const body = (await req.json().catch(() => ({}))) as { sequenceId?: string; testMode?: boolean };
        const sequenceId = body.sequenceId?.trim();
        const testMode = Boolean(body.testMode || process.env.TWILIO_TEST_MODE === "1");
        if (!sequenceId) return bad(400, "sequenceId_required");

        const seqRef = adminDb.collection("teams").doc(teamCtx.team.id).collection("salesSequences").doc(sequenceId);
        const seqSnap = await seqRef.get();
        if (!seqSnap.exists) return bad(404, "not_found");
        const seq = seqSnap.data() as SalesSequenceDoc;
        if (!Array.isArray(seq.targets) || seq.targets.length === 0) return bad(400, "no_targets");
        if (!Array.isArray(seq.steps) || seq.steps.length === 0) return bad(400, "no_steps");

        // Start execution doc
        const execRef = await adminDb.collection("teams").doc(teamCtx.team.id).collection("salesExecutions").add({
            sequenceId,
            runBy: uid,
            testMode,
            startedAt: new Date(),
            results: [],
            stats: { attempted: 0, succeeded: 0, failed: 0 },
        } as SalesExecutionDoc);

        const results: SalesExecutionResult[] = [];
        // Only implement first-step call execution for now; future: iterate steps/time windows.
        const firstStep = seq.steps[0];
        const toCall = seq.targets.filter((t) => !!t.phone);

        // Fire per-target API call to telephony route; in test mode, no external call placed
        for (const t of toCall) {
            const startedAt = new Date();
            try {
                const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/telephony/call`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ to: t.phone, testMode }),
                });
                const json = (await resp.json().catch(() => ({}))) as { callSid?: string };
                const okRes: SalesExecutionResult = {
                    targetId: String(t.id),
                    stepId: String(firstStep.id),
                    stepType: firstStep.type,
                    callSid: json.callSid,
                    ok: resp.ok,
                    startedAt,
                    completedAt: new Date(),
                };
                results.push(okRes);
            } catch (err: unknown) {
                results.push({
                    targetId: String(t.id),
                    stepId: String(firstStep.id),
                    stepType: firstStep.type,
                    ok: false,
                    error: (err && typeof err === 'object' && 'message' in err)
                        ? String((err as { message?: unknown }).message)
                        : String(err),
                    startedAt,
                    completedAt: new Date(),
                });
            }
        }

        const attempted = results.length;
        const succeeded = results.filter((r) => r.ok).length;
        const failed = attempted - succeeded;
        await execRef.set(
            { results, stats: { attempted, succeeded, failed }, completedAt: new Date() },
            { merge: true }
        );

        logger.info("run_complete", { teamId: teamCtx.team.id, sequenceId, execId: execRef.id, attempted, succeeded, failed, testMode });
        return ok({ executionId: execRef.id, attempted, succeeded, failed, testMode });
    } catch (e: unknown) {
        const status = (e && typeof e === 'object' && 'status' in e && typeof (e as { status?: unknown }).status === 'number')
            ? (e as { status: number }).status
            : 500;
        const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : String(e);
        logger.error("run_failed", { error: msg });
        return bad(status, status === 401 ? "unauthorized" : "internal_error");
    }
}
