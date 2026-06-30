/**
 * GET /api/integrations/stripe/callback — Stripe redirects here after the user authorizes. Exchanges
 * the code for the connected account id (user identified via the signed `state`), stores it, and
 * bounces back to the Finance page.
 */
import {
  consumeOAuthState,
  exchangeCode,
  storeAccount,
  stripeConnectConfig,
} from "@/lib/integrations/stripe-connect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { appUrl } = stripeConnectConfig();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const back = (status: string) =>
    NextResponse.redirect(`${appUrl}/finance?stripe=${status}`);

  if (oauthError) return back("denied");
  if (!code || !state) return back("error");

  try {
    const uid = await consumeOAuthState(state);
    if (!uid) return back("expired");
    const { stripeAccountId } = await exchangeCode(code);
    await storeAccount(uid, stripeAccountId);
    return back("connected");
  } catch {
    return back("error");
  }
}
