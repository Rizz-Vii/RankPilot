/**
 * /api/integrations/gsc/data — authenticated access to the user's REAL Search Console data.
 *   GET  → connection status { connected, scope, updatedAt }.
 *   POST → { siteUrl? }. Without siteUrl: list verified sites. With siteUrl: top queries (last 28d)
 *          mapped to AnalysisItem[] with provenance 'measured'.
 */
import { adminAuth } from "@/lib/firebase-admin";
import {
  getConnection,
  gscRowsToAnalysisItems,
  listSites,
  querySearchAnalytics,
} from "@/lib/integrations/gsc";
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
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getConnection(uid));
}

export async function POST(req: NextRequest) {
  const uid = await requireUid(req);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const conn = await getConnection(uid);
  if (!conn.connected) {
    return NextResponse.json({ connected: false });
  }

  let body: { siteUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is valid */
  }

  try {
    if (!body.siteUrl) {
      const sites = await listSites(uid);
      return NextResponse.json({ connected: true, sites, provenance: "measured" });
    }
    const rows = await querySearchAnalytics(uid, body.siteUrl, {
      days: 28,
      rowLimit: 25,
    });
    return NextResponse.json({
      connected: true,
      siteUrl: body.siteUrl,
      items: gscRowsToAnalysisItems(rows),
      totalRows: rows.length,
      provenance: "measured",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { connected: true, error: msg },
      { status: 500 }
    );
  }
}
