/**
 * POST /api/integrations/nango/session — issues a Nango Connect session token (Bearer-authed) the
 * frontend Nango Connect UI uses to run a provider's OAuth popup. One endpoint for ALL unified-API
 * providers. Returns 503 configured:false until the owner sets NANGO_SECRET_KEY.
 */
import { adminAuth } from "@/lib/firebase-admin";
import { createConnectSession, nangoConfig } from "@/lib/integrations/nango";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

  if (!nangoConfig().configured) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Unified integrations are not configured yet. Set NANGO_SECRET_KEY.",
      },
      { status: 503 }
    );
  }

  let allowed: string[] | undefined;
  try {
    const body = (await req.json()) as { integrations?: string[] };
    allowed = Array.isArray(body.integrations) ? body.integrations : undefined;
  } catch {
    /* no body is fine */
  }

  const token = await createConnectSession(uid, allowed);
  if (!token) {
    return NextResponse.json(
      { error: "could_not_create_session" },
      { status: 502 }
    );
  }
  return NextResponse.json({ token });
}
