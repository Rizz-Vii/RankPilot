/**
 * GET /api/integrations/gsc/start — begins the Google Search Console OAuth flow.
 * Authenticated (Bearer): returns { authUrl } the client redirects to. State binds the callback to
 * this user. Returns 503 with configured:false until the owner sets the OAuth client secrets.
 */
import { adminAuth } from "@/lib/firebase-admin";
import { createOAuthState, getAuthUrl, gscConfig } from "@/lib/integrations/gsc";
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

  if (!gscConfig().configured) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Google Search Console OAuth is not configured yet. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  const state = await createOAuthState(uid);
  return NextResponse.json({ authUrl: getAuthUrl(state) });
}
