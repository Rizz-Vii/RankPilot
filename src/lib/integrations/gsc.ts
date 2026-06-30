/**
 * Google Search Console integration — RankPilot's FIRST 'measured' data source.
 *
 * Read-only OAuth web flow: a user connects their own Search Console, we store their tokens per-user,
 * and query their real impressions / clicks / positions / queries. These map to AnalysisItem[] with
 * `provenance: 'measured'` — the honesty north star realized: real numbers, not LLM-invented ones.
 *
 * ONE-TIME OWNER SETUP (Claude cannot create OAuth clients or enter credentials):
 *   1. Google Cloud Console → APIs & Services → Library → enable "Google Search Console API".
 *   2. Credentials → Create OAuth client ID → Web application.
 *   3. Authorized redirect URI:  <APP_URL>/api/integrations/gsc/callback
 *      (default APP_URL = https://rankpilot-h3jpc.web.app)
 *   4. OAuth consent screen → User type External → add your Google account under "Test users"
 *      (webmasters.readonly is a sensitive scope; test users bypass app verification, up to 100).
 *   5. Set env/secrets: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
 *      (optional override: GSC_REDIRECT_URI).
 *
 * Uses raw REST (no googleapis dependency) to keep the surface small and dependency-risk zero.
 */

import { adminDb } from "@/lib/firebase-admin";
import type { AnalysisItem } from "@/lib/site-intelligence/types";

const OAUTH_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN = "https://oauth2.googleapis.com/token";
const GSC_BASE = "https://searchconsole.googleapis.com/webmasters/v3";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export function gscConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://rankpilot-h3jpc.web.app";
  const redirectUri =
    process.env.GSC_REDIRECT_URI || `${appUrl}/api/integrations/gsc/callback`;
  return {
    clientId,
    clientSecret,
    redirectUri,
    appUrl,
    configured: !!(clientId && clientSecret),
  };
}

export function getAuthUrl(state: string): string {
  const { clientId, redirectUri } = gscConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${OAUTH_AUTH}?${params.toString()}`;
}

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  scope?: string;
}

export async function exchangeCode(code: string): Promise<StoredTokens> {
  const { clientId, clientSecret, redirectUri } = gscConfig();
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`token_exchange_failed: ${res.status} ${await res.text()}`);
  }
  const j = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
    scope: j.scope,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const { clientId, clientSecret } = gscConfig();
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token_refresh_failed: ${res.status}`);
  const j = (await res.json()) as {
    access_token: string;
    expires_in?: number;
    scope?: string;
  };
  return {
    accessToken: j.access_token,
    refreshToken, // Google does not reissue refresh tokens on refresh
    expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
    scope: j.scope,
  };
}

function tokenDoc(uid: string) {
  return adminDb
    .collection("users")
    .doc(uid)
    .collection("integrations")
    .doc("gsc");
}

export async function storeTokens(
  uid: string,
  t: StoredTokens
): Promise<void> {
  await tokenDoc(uid).set({ ...t, updatedAt: Date.now() }, { merge: true });
}

export async function getConnection(
  uid: string
): Promise<{ connected: boolean; scope?: string; updatedAt?: number }> {
  const snap = await tokenDoc(uid).get();
  if (!snap.exists) return { connected: false };
  const d = snap.data() as StoredTokens & { updatedAt?: number };
  return { connected: !!d.accessToken, scope: d.scope, updatedAt: d.updatedAt };
}

export async function disconnect(uid: string): Promise<void> {
  await tokenDoc(uid).delete();
}

/** Returns a valid access token, refreshing if near expiry. Throws 'not_connected' if absent. */
async function getValidAccessToken(uid: string): Promise<string> {
  const snap = await tokenDoc(uid).get();
  if (!snap.exists) throw new Error("not_connected");
  const d = snap.data() as StoredTokens;
  if (d.accessToken && d.expiresAt - 60_000 > Date.now()) return d.accessToken;
  if (!d.refreshToken) throw new Error("token_expired_no_refresh");
  const refreshed = await refreshAccessToken(d.refreshToken);
  await storeTokens(uid, refreshed);
  return refreshed.accessToken;
}

// ---- Short-lived OAuth state (binds the callback to the initiating user) ----

export async function createOAuthState(uid: string): Promise<string> {
  const state = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await adminDb
    .collection("gscOauthStates")
    .doc(state)
    .set({ uid, createdAt: Date.now() });
  return state;
}

export async function consumeOAuthState(state: string): Promise<string | null> {
  const ref = adminDb.collection("gscOauthStates").doc(state);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data() as { uid: string; createdAt: number };
  await ref.delete().catch(() => {});
  if (Date.now() - d.createdAt > 10 * 60 * 1000) return null; // 10-minute expiry
  return d.uid;
}

// ---- Search Console data ----

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export async function listSites(uid: string): Promise<GscSite[]> {
  const token = await getValidAccessToken(uid);
  const res = await fetch(`${GSC_BASE}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`list_sites_failed: ${res.status}`);
  const j = (await res.json()) as { siteEntry?: GscSite[] };
  return Array.isArray(j.siteEntry) ? j.siteEntry : [];
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function querySearchAnalytics(
  uid: string,
  siteUrl: string,
  opts?: { days?: number; dimensions?: string[]; rowLimit?: number }
): Promise<GscRow[]> {
  const token = await getValidAccessToken(uid);
  const days = opts?.days ?? 28;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const res = await fetch(
    `${GSC_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: fmt(new Date(Date.now() - days * 86400000)),
        endDate: fmt(new Date()),
        dimensions: opts?.dimensions ?? ["query"],
        rowLimit: opts?.rowLimit ?? 25,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`search_analytics_failed: ${res.status} ${await res.text()}`);
  }
  const j = (await res.json()) as { rows?: GscRow[] };
  return Array.isArray(j.rows) ? j.rows : [];
}

/**
 * Map GSC query rows → MEASURED AnalysisItems. This is the honesty payoff: every field is a real
 * number from Google, so provenance is unambiguously 'measured'.
 */
export function gscRowsToAnalysisItems(rows: GscRow[]): AnalysisItem[] {
  return rows.map((r, i) => {
    const query = r.keys?.[0] ?? "(unknown)";
    const pos = Math.round(r.position * 10) / 10;
    const status: AnalysisItem["status"] =
      pos <= 10 ? "pass" : pos <= 20 ? "warning" : "info";
    const impact: AnalysisItem["impact"] =
      pos <= 3 ? "low" : pos <= 10 ? "medium" : "high";
    return {
      id: `gsc-${i}-${query.slice(0, 24)}`,
      category: "seo",
      title: `"${query}" — position ${pos}`,
      description: `${r.clicks} clicks, ${r.impressions} impressions, CTR ${(r.ctr * 100).toFixed(1)}% over the last 28 days (Google Search Console).`,
      provenance: "measured",
      impact,
      status,
      score: Math.max(0, Math.min(100, Math.round(100 - (pos - 1) * 5))),
      confidence: 1,
      evidence: [
        `clicks=${r.clicks}`,
        `impressions=${r.impressions}`,
        `ctr=${(r.ctr * 100).toFixed(2)}%`,
        `avgPosition=${pos}`,
      ],
      recommendation:
        pos > 10
          ? `Ranking on page 2+ for "${query}" with ${r.impressions} impressions — optimize this page to capture demand that already exists.`
          : pos > 3
            ? `Position ${pos} for "${query}" — a push into the top 3 could materially lift CTR.`
            : `Strong position ${pos} for "${query}" — protect and monitor this ranking.`,
    };
  });
}
