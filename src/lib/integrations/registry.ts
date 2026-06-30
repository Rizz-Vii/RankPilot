/**
 * Integration registry + normalized "Business Health" model.
 *
 * THE ARCHITECTURE: RankPilot does NOT hand-build every connector. Two providers we own natively
 * (Google Search Console, Stripe) prove the per-OAuth pattern; everything else comes through a
 * unified-API / embedded-iPaaS layer (Nango / Merge) so "support Shopify + Amazon + QuickBooks + …"
 * is one architectural bet against a normalized schema rather than fifty bespoke builds.
 *
 * Every connector — native or unified-API — maps its data into the same `ChannelMetrics` shape, so
 * the command center ("one P&L + one visibility score across every avenue") works for a pizza shop
 * and a dropshipper alike; only the connector list differs by archetype.
 */

export type IntegrationCategory =
  | "search"
  | "payments"
  | "ecommerce"
  | "pos"
  | "ads"
  | "analytics"
  | "accounting"
  | "crm"
  | "reviews"
  | "social";

/** Which normalized signals a connector feeds into the command center. */
export type Signal =
  | "revenue"
  | "spend"
  | "visibility"
  | "traffic"
  | "engagement";

export interface IntegrationDef {
  key: string;
  name: string;
  category: IntegrationCategory;
  /** 'native' = OAuth we built; 'unified' = via the Nango/Merge layer (roadmap until that ships). */
  via: "native" | "unified";
  /** Status endpoint for native integrations (GET → { connected }). */
  statusUrl?: string;
  /** Where the user manages/connects this integration. */
  manageHref?: string;
  contributes: Signal[];
  /** Primary archetypes this unlocks — drives archetype-first rollout. */
  archetypes: string[];
}

export const INTEGRATIONS: IntegrationDef[] = [
  // ---- Native (live) ----
  {
    key: "google-search-console",
    name: "Google Search Console",
    category: "search",
    via: "native",
    statusUrl: "/api/integrations/gsc/data",
    manageHref: "/integrations/search-console",
    contributes: ["visibility", "traffic"],
    archetypes: ["all"],
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "payments",
    via: "native",
    statusUrl: "/api/integrations/stripe/data",
    manageHref: "/finance",
    contributes: ["revenue"],
    archetypes: ["saas", "ecommerce", "all"],
  },

  // ---- Unified-API layer (roadmap: one Nango/Merge integration lights these up) ----
  // E-commerce / dropshipper beachhead
  { key: "shopify", name: "Shopify", category: "ecommerce", via: "unified", contributes: ["revenue", "spend"], archetypes: ["ecommerce", "dropshipper"] },
  { key: "woocommerce", name: "WooCommerce", category: "ecommerce", via: "unified", contributes: ["revenue"], archetypes: ["ecommerce"] },
  { key: "amazon", name: "Amazon Seller", category: "ecommerce", via: "unified", contributes: ["revenue", "spend"], archetypes: ["dropshipper"] },
  { key: "etsy", name: "Etsy", category: "ecommerce", via: "unified", contributes: ["revenue"], archetypes: ["dropshipper"] },
  // Ads (true ROAS / profit)
  { key: "meta-ads", name: "Meta Ads", category: "ads", via: "unified", contributes: ["spend", "traffic"], archetypes: ["ecommerce", "dropshipper"] },
  { key: "google-ads", name: "Google Ads", category: "ads", via: "unified", contributes: ["spend", "traffic"], archetypes: ["all"] },
  { key: "tiktok-ads", name: "TikTok Ads", category: "ads", via: "unified", contributes: ["spend", "traffic"], archetypes: ["ecommerce"] },
  // Analytics
  { key: "ga4", name: "Google Analytics 4", category: "analytics", via: "unified", contributes: ["traffic", "engagement"], archetypes: ["all"] },
  // POS / local (pizza shop, franchise)
  { key: "square", name: "Square POS", category: "pos", via: "unified", contributes: ["revenue"], archetypes: ["local", "franchise"] },
  { key: "toast", name: "Toast POS", category: "pos", via: "unified", contributes: ["revenue"], archetypes: ["local"] },
  { key: "clover", name: "Clover POS", category: "pos", via: "unified", contributes: ["revenue"], archetypes: ["local", "franchise"] },
  // Accounting
  { key: "quickbooks", name: "QuickBooks", category: "accounting", via: "unified", contributes: ["revenue", "spend"], archetypes: ["all"] },
  { key: "xero", name: "Xero", category: "accounting", via: "unified", contributes: ["revenue", "spend"], archetypes: ["all"] },
  // CRM (agency / sales attribution)
  { key: "hubspot", name: "HubSpot", category: "crm", via: "unified", contributes: ["engagement"], archetypes: ["agency", "saas"] },
  { key: "pipedrive", name: "Pipedrive", category: "crm", via: "unified", contributes: ["engagement"], archetypes: ["agency"] },
  // Reviews / local visibility
  { key: "google-business", name: "Google Business Profile", category: "reviews", via: "unified", contributes: ["visibility", "engagement"], archetypes: ["local", "franchise"] },
];

export function integrationsByCategory(): Record<IntegrationCategory, IntegrationDef[]> {
  return INTEGRATIONS.reduce(
    (acc, i) => {
      (acc[i.category] ||= []).push(i);
      return acc;
    },
    {} as Record<IntegrationCategory, IntegrationDef[]>
  );
}

// ---- Normalized command-center model ----

/** One avenue's contribution, normalized regardless of source connector. */
export interface ChannelMetrics {
  channel: string; // "Shopify", "DoorDash", "Organic Search", …
  category: IntegrationCategory;
  revenue?: number;
  cost?: number; // ad spend + platform fees + COGS attributable
  profit?: number; // revenue - cost
  sessions?: number;
  conversions?: number;
  provenance: "measured" | "estimated" | "simulated";
}

/** The "one P&L + one visibility score across every avenue" the command center renders. */
export interface BusinessHealth {
  period: { start: string; end: string };
  channels: ChannelMetrics[];
  totals: { revenue: number; cost: number; profit: number; sessions: number };
  /** Cross-surface AI-authority score (Google + AI + Reddit + social + local). */
  visibilityScore?: number;
  generatedAt: string;
  /** Worst provenance across channels — the report can't claim more than its least-trustworthy input. */
  provenance: "measured" | "estimated" | "simulated";
}
