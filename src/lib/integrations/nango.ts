/**
 * Unified-API adapter layer (Nango). This is the leverage point: ONE integration that lights up the
 * "Coming soon" connectors (Shopify, Amazon, Meta Ads, Square, QuickBooks, …) and feeds them into the
 * same normalized ChannelMetrics the command center already renders.
 *
 * Raw REST (no SDK dependency, same pattern as gsc.ts / stripe-connect.ts). Degrades to empty/“not
 * configured” until the owner sets NANGO_SECRET_KEY, so nothing breaks before the account exists.
 *
 * OWNER SETUP (Claude cannot create the account):
 *   1. Create a Nango account (nango.dev) → enable the providers you want (Shopify, Meta Ads, …).
 *      Name each integration's "Provider Config Key" to MATCH the registry key (e.g. "shopify").
 *   2. Connect UI redirect/origin: add your app origin in Nango's Connect settings.
 *   3. Set NANGO_SECRET_KEY (server) and NEXT_PUBLIC_NANGO_CONNECT_BASE if self-hosting.
 *   We use connection_id = the user's uid, so a user's connected accounts are namespaced to them.
 */

import type { ChannelMetrics, IntegrationCategory } from "./registry";
import { INTEGRATIONS } from "./registry";

const NANGO_BASE = process.env.NANGO_API_BASE || "https://api.nango.dev";

export function nangoConfig() {
  const secretKey = process.env.NANGO_SECRET_KEY || "";
  return { secretKey, base: NANGO_BASE, configured: !!secretKey };
}

function authHeaders(): Record<string, string> {
  const { secretKey } = nangoConfig();
  return { Authorization: `Bearer ${secretKey}` };
}

/**
 * Creates a Connect session token the frontend Nango Connect UI exchanges to run the OAuth popup —
 * no per-provider /start+/callback code. Returns null when Nango isn't configured.
 */
export async function createConnectSession(
  uid: string,
  allowedIntegrations?: string[]
): Promise<string | null> {
  if (!nangoConfig().configured) return null;
  try {
    const res = await fetch(`${nangoConfig().base}/connect/sessions`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        end_user: { id: uid },
        ...(allowedIntegrations?.length
          ? { allowed_integrations: allowedIntegrations }
          : {}),
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { token?: string } };
    return j.data?.token ?? null;
  } catch {
    return null;
  }
}

/** Which provider-config-keys this user has connected (so the hub can show real status). */
export async function listConnectedProviders(uid: string): Promise<Set<string>> {
  if (!nangoConfig().configured) return new Set();
  try {
    const res = await fetch(
      `${nangoConfig().base}/connection?connectionId=${encodeURIComponent(uid)}`,
      { headers: authHeaders() }
    );
    if (!res.ok) return new Set();
    const j = (await res.json()) as {
      connections?: Array<{ provider_config_key?: string }>;
    };
    return new Set(
      (j.connections || [])
        .map((c) => c.provider_config_key)
        .filter((k): k is string => !!k)
    );
  } catch {
    return new Set();
  }
}

/** Proxy a GET to a connected provider's API through Nango (real-time, no sync setup needed). */
async function proxyGet<T = unknown>(
  uid: string,
  providerConfigKey: string,
  endpoint: string
): Promise<T | null> {
  if (!nangoConfig().configured) return null;
  try {
    const res = await fetch(
      `${nangoConfig().base}/proxy/${endpoint.replace(/^\//, "")}`,
      {
        headers: {
          ...authHeaders(),
          "Connection-Id": uid,
          "Provider-Config-Key": providerConfigKey,
        },
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---- Per-provider → ChannelMetrics mappers ----
// Beachhead (e-commerce) implemented concretely; others follow the same shape as they're enabled.

async function shopifyToChannel(uid: string): Promise<ChannelMetrics | null> {
  const since = new Date(Date.now() - 28 * 86400000).toISOString();
  const data = await proxyGet<{ orders?: Array<{ total_price?: string }> }>(
    uid,
    "shopify",
    `admin/api/2024-04/orders.json?status=any&created_at_min=${since}&limit=250&fields=total_price`
  );
  if (!data?.orders) return null;
  const revenue = data.orders.reduce(
    (sum, o) => sum + (parseFloat(o.total_price || "0") || 0),
    0
  );
  return {
    channel: "Shopify",
    category: "ecommerce",
    revenue,
    provenance: "measured",
  };
}

const PROVIDER_MAPPERS: Record<
  string,
  (uid: string) => Promise<ChannelMetrics | null>
> = {
  shopify: shopifyToChannel,
  // amazon, etsy, woocommerce, meta-ads, square, toast, quickbooks … add as enabled in Nango.
};

/**
 * For every connected provider in a category, map its data → ChannelMetrics. Slots directly into
 * getBusinessHealth's Promise.all. Returns [] when Nango isn't configured or nothing's connected.
 */
export async function nangoCategoryToChannels(
  uid: string,
  category: IntegrationCategory
): Promise<ChannelMetrics[]> {
  if (!nangoConfig().configured) return [];
  const connected = await listConnectedProviders(uid);
  if (!connected.size) return [];
  const providers = INTEGRATIONS.filter(
    (i) =>
      i.via === "unified" &&
      i.category === category &&
      connected.has(i.key) &&
      PROVIDER_MAPPERS[i.key]
  );
  const results = await Promise.all(
    providers.map(async (p) => {
      try {
        return await PROVIDER_MAPPERS[p.key](uid);
      } catch {
        return null;
      }
    })
  );
  return results.filter((c): c is ChannelMetrics => !!c);
}
