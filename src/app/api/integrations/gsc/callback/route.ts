/**
 * GET /api/integrations/gsc/callback — Google redirects here after consent. Exchanges the code for
 * tokens (the user is identified via the signed-in `state`, not a Bearer token, since this is a
 * browser redirect from Google), stores them, and bounces back to the integrations page.
 */
import {
  consumeOAuthState,
  exchangeCode,
  gscConfig,
  storeTokens,
} from "@/lib/integrations/gsc";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { appUrl } = gscConfig();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const back = (status: string) =>
    NextResponse.redirect(
      `${appUrl}/integrations/search-console?gsc=${status}`
    );

  if (oauthError) return back("denied");
  if (!code || !state) return back("error");

  try {
    const uid = await consumeOAuthState(state);
    if (!uid) return back("expired");
    const tokens = await exchangeCode(code);
    await storeTokens(uid, tokens);
    return back("connected");
  } catch {
    return back("error");
  }
}
