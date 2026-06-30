/**
 * GET /api/integrations/stripe/start — begins the per-user Stripe Connect OAuth flow.
 * Authenticated (Bearer): returns { authUrl } the client redirects to. Returns 503 configured:false
 * until the owner sets STRIPE_CONNECT_CLIENT_ID.
 */
import { adminAuth } from "@/lib/firebase-admin";
import {
  createOAuthState,
  getAuthUrl,
  stripeConnectConfig,
} from "@/lib/integrations/stripe-connect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }
  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(
      authHeader.replace(/^Bearer\s+/i, "")
    );
    uid = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401 }
    );
  }

  if (!stripeConnectConfig().configured) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Stripe Connect is not configured yet. Set STRIPE_CONNECT_CLIENT_ID.",
      },
      { status: 503 }
    );
  }

  const state = await createOAuthState(uid);
  return NextResponse.json({ authUrl: getAuthUrl(state) });
}
