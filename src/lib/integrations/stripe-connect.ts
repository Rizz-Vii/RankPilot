/**
 * Stripe Connect integration — lets each USER connect THEIR OWN Stripe account so the multi-tenant
 * Finance dashboard shows THEIR real revenue, never RankPilot's. We use OAuth (read_only) and then
 * call Stripe with the platform secret key + the `Stripe-Account` header to read the connected
 * account. RankPilot's STRIPE_SECRET_KEY is the *platform* key — it is never exposed as a user's data.
 *
 * ONE-TIME OWNER SETUP (Claude cannot create Connect platforms or enter credentials):
 *   1. Stripe Dashboard → Connect → get started (enable OAuth / Standard accounts).
 *   2. Settings → Connect → Onboarding options / OAuth: add redirect URI
 *      <APP_URL>/api/integrations/stripe/callback
 *   3. Copy the Connect OAuth client id (starts with `ca_`) → set STRIPE_CONNECT_CLIENT_ID.
 *      (STRIPE_SECRET_KEY is already wired and is reused for the token exchange + Connect calls.)
 */
import { adminDb } from "@/lib/firebase-admin";
import {
  computeRevenueMetrics,
  type RevenueSnapshot,
  type SubscriptionEvent,
} from "@/lib/finance/revenue-metrics";

const OAUTH_AUTHORIZE = "https://connect.stripe.com/oauth/authorize";
const OAUTH_TOKEN = "https://connect.stripe.com/oauth/token";

export function stripeConnectConfig() {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || "";
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://rankpilot-h3jpc.web.app";
  const redirectUri =
    process.env.STRIPE_CONNECT_REDIRECT_URI ||
    `${appUrl}/api/integrations/stripe/callback`;
  return {
    clientId,
    secretKey,
    appUrl,
    redirectUri,
    configured: !!(clientId && secretKey),
  };
}

export function getAuthUrl(state: string): string {
  const { clientId, redirectUri } = stripeConnectConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only",
    redirect_uri: redirectUri,
    state,
  });
  return `${OAUTH_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeCode(
  code: string
): Promise<{ stripeAccountId: string }> {
  const { secretKey } = stripeConnectConfig();
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_secret: secretKey,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `stripe_token_exchange_failed: ${res.status} ${await res.text()}`
    );
  }
  const j = (await res.json()) as { stripe_user_id?: string };
  if (!j.stripe_user_id) throw new Error("no_stripe_user_id");
  return { stripeAccountId: j.stripe_user_id };
}

function tokenDoc(uid: string) {
  return adminDb
    .collection("users")
    .doc(uid)
    .collection("integrations")
    .doc("stripe");
}

export async function storeAccount(
  uid: string,
  stripeAccountId: string
): Promise<void> {
  await tokenDoc(uid).set(
    { stripeAccountId, connectedAt: Date.now() },
    { merge: true }
  );
}

export async function getConnection(
  uid: string
): Promise<{ connected: boolean; stripeAccountId?: string }> {
  const snap = await tokenDoc(uid).get();
  if (!snap.exists) return { connected: false };
  const d = snap.data() as { stripeAccountId?: string };
  return { connected: !!d.stripeAccountId, stripeAccountId: d.stripeAccountId };
}

export async function disconnect(uid: string): Promise<void> {
  await tokenDoc(uid).delete();
}

export async function createOAuthState(uid: string): Promise<string> {
  const state = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await adminDb
    .collection("stripeOauthStates")
    .doc(state)
    .set({ uid, createdAt: Date.now() });
  return state;
}

export async function consumeOAuthState(state: string): Promise<string | null> {
  const ref = adminDb.collection("stripeOauthStates").doc(state);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data() as { uid: string; createdAt: number };
  await ref.delete().catch(() => {});
  if (Date.now() - d.createdAt > 10 * 60 * 1000) return null;
  return d.uid;
}

/** Normalize any recurring price to a monthly amount (in major currency units). */
function monthlyAmount(
  price:
    | {
        unit_amount?: number | null;
        recurring?: { interval?: string; interval_count?: number } | null;
      }
    | null
    | undefined,
  quantity?: number
): number {
  const amt = ((price?.unit_amount || 0) / 100) * (quantity || 1);
  const interval = price?.recurring?.interval;
  const count = price?.recurring?.interval_count || 1;
  if (interval === "year") return amt / (12 * count);
  if (interval === "week") return (amt * 52) / 12 / count;
  if (interval === "day") return (amt * 365) / 12 / count;
  return amt / count; // monthly (default)
}

/**
 * Reads the connected account's ACTIVE subscriptions and computes a real revenue snapshot
 * (MRR/ARR/active customers/churn). Returns null when the user has not connected Stripe. All
 * figures are 'measured' — straight from the user's own Stripe.
 */
export async function getRevenueSnapshot(
  uid: string
): Promise<RevenueSnapshot | null> {
  const conn = await getConnection(uid);
  if (!conn.connected || !conn.stripeAccountId) return null;
  const { secretKey } = stripeConnectConfig();
  if (!secretKey) return null;

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secretKey);

  const subs: SubscriptionEvent[] = [];
  let startingAfter: string | undefined;
  let guard = 0;
  do {
    const page = await stripe.subscriptions.list(
      {
        status: "active",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: conn.stripeAccountId }
    );
    for (const s of page.data) {
      let monthly = 0;
      for (const item of s.items.data) {
        monthly += monthlyAmount(item.price, item.quantity);
      }
      const customerId =
        typeof s.customer === "string" ? s.customer : s.customer?.id || s.id;
      subs.push({
        userId: customerId,
        amountMonthly: monthly,
        status: "active",
        startedAt: new Date((s.start_date || s.created) * 1000),
        canceledAt: null,
      });
    }
    startingAfter = page.has_more
      ? page.data[page.data.length - 1]?.id
      : undefined;
  } while (startingAfter && guard++ < 20);

  return computeRevenueMetrics(subs);
}
