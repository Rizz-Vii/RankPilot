/**
 * /api/integrations/stripe/data — authenticated access to the user's own Stripe revenue.
 *   GET  → connection status { connected }.
 *   POST → real revenue snapshot { connected, snapshot: { mrr, arr, activeCustomers, ... },
 *          provenance: 'measured' } from the user's connected Stripe account.
 */
import { adminAuth } from "@/lib/firebase-admin";
import {
  getConnection,
  getRevenueSnapshot,
} from "@/lib/integrations/stripe-connect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUid(req: NextRequest): Promise<string | null> {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(
      authHeader.replace(/^Bearer\s+/i, "")
    );
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await requireUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getConnection(uid));
}

export async function POST(req: NextRequest) {
  const uid = await requireUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const conn = await getConnection(uid);
  if (!conn.connected) return NextResponse.json({ connected: false });

  try {
    const snapshot = await getRevenueSnapshot(uid);
    return NextResponse.json({
      connected: true,
      snapshot,
      provenance: "measured",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ connected: true, error: msg }, { status: 500 });
  }
}
