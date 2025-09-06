import { canAccessFeature, normalizeUserAccess } from "@/lib/access-control";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getLogger } from "@/lib/logging/app-logger";
import { getUserTeamContext } from "@/lib/team/team-access";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function bad(status: number, error: string) { return NextResponse.json({ error }, { status }); }
function ok(data: unknown, init?: number) { return NextResponse.json<unknown>(data, { status: init ?? 200 }); }

export async function GET(req: NextRequest) {
    const logger = getLogger("api.sales.executions.recent");
    try {
        // Allow CI/crawlers to probe without auth when a valid probe token is present
        const probe = req.headers.get('x-probe-token');
        if (probe && probe === process.env.CRAWL_PROBE_TOKEN) {
            try {
                // Return the most recent executions across teams for lightweight diagnostics
                const cg = await adminDb
                    .collectionGroup('salesExecutions')
                    .orderBy('startedAt', 'desc')
                    .limit(3)
                    .get();
                const executions = cg.docs.map((d) => ({
                    id: d.id,
                    teamId: d.ref.parent.parent?.id ?? null,
                    ...d.data(),
                }));
                return ok({ probe: true, executions });
            } catch (cgErr) {
                logger.degraded('probe_collection_group_failed', { error: cgErr instanceof Error ? cgErr.message : String(cgErr) });
                return ok({ probe: true, executions: [] });
            }
        }

        const auth = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!auth) {
            // In development, surface an empty list instead of hard 401 to support local UI without auth wiring
            if (process.env.NODE_ENV !== 'production') {
                logger.degraded('dev_unauth_recent_executions', { note: 'returning empty list in dev without auth' });
                return ok({ executions: [] });
            }
            return bad(401, "unauthorized");
        }
        const token = auth.replace("Bearer ", "");
        let decoded: { uid?: string };
        try {
            decoded = await adminAuth.verifyIdToken(token);
        } catch (authErr) {
            const errMsg = authErr instanceof Error ? authErr.message : String(authErr);
            logger.error('verify_token_failed', { error: errMsg });
            return bad(401, 'invalid_token');
        }
        const uid = String(decoded?.uid || "");
        const profileSnap = await adminDb.collection("users").doc(uid).get();
        const ua = normalizeUserAccess((profileSnap.exists ? profileSnap.data() : {}) || {});
        if (!canAccessFeature(ua, "sales_outreach")) return bad(403, "forbidden");
        const teamCtx = await getUserTeamContext(uid);
        const teamId = teamCtx.team?.id;
        if (!teamId) return ok({ executions: [] });
        const snap = await adminDb.collection("teams").doc(teamId).collection("salesExecutions").orderBy("startedAt", "desc").limit(3).get();
        const executions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return ok({ executions });
    } catch (e: unknown) {
        const errMsg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : String(e);
        logger.error("recent_failed", { error: errMsg });
        // Always return JSON with 500 to avoid empty socket responses
        return bad(500, "internal_error");
    }
}
