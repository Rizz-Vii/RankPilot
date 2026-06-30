/**
 * GET /api/business-health — the command-center engine, authed. Returns BusinessHealth: one
 * normalized P&L + traffic across every connected avenue (Stripe + GSC today; unified-API
 * connectors as they land). Identity from the verified token.
 */
import { adminAuth } from "@/lib/firebase-admin";
import { getBusinessHealth } from "@/lib/integrations/business-health";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(
      authHeader.replace(/^Bearer\s+/i, "")
    );
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const health = await getBusinessHealth(uid);
    return NextResponse.json(health);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 }
    );
  }
}
