/**
 * The command-center ENGINE: getBusinessHealth() aggregates every connected avenue into one
 * normalized BusinessHealth (one P&L + traffic, worst-provenance-honest). Native adapters (Stripe,
 * GSC) are wired today; unified-API category adapters (e-commerce, ads, POS, accounting via
 * Nango/Merge) slot in as one more entry in the Promise.all below — that's the whole point of the
 * normalized ChannelMetrics shape.
 */

import { worstProvenance } from "@/lib/site-intelligence/types";
import {
  getConnection as gscGetConnection,
  listSites,
  querySearchAnalytics,
} from "./gsc";
import { nangoCategoryToChannels } from "./nango";
import type { BusinessHealth, ChannelMetrics } from "./registry";
import { getRevenueSnapshot } from "./stripe-connect";

/** Stripe (native) → revenue channel. MRR is the monthly recurring contribution. */
async function stripeToChannels(uid: string): Promise<ChannelMetrics[]> {
  try {
    const snap = await getRevenueSnapshot(uid);
    if (!snap) return [];
    return [
      {
        channel: "Stripe (subscriptions)",
        category: "payments",
        revenue: snap.mrr,
        cost: 0,
        profit: snap.mrr,
        provenance: "measured",
      },
    ];
  } catch {
    return [];
  }
}

/** GSC (native) → organic-search traffic channel (total clicks across verified sites, 28d). */
async function gscToChannels(uid: string): Promise<ChannelMetrics[]> {
  try {
    const conn = await gscGetConnection(uid);
    if (!conn.connected) return [];
    const sites = await listSites(uid);
    if (!sites.length) return [];
    let clicks = 0;
    for (const s of sites.slice(0, 5)) {
      try {
        const rows = await querySearchAnalytics(uid, s.siteUrl, {
          days: 28,
          dimensions: [],
          rowLimit: 1,
        });
        clicks += rows[0]?.clicks || 0;
      } catch {
        /* skip a site we can't read */
      }
    }
    return [
      {
        channel: "Organic Search (GSC)",
        category: "search",
        sessions: clicks,
        provenance: "measured",
      },
    ];
  } catch {
    return [];
  }
}

export async function getBusinessHealth(uid: string): Promise<BusinessHealth> {
  const end = new Date();
  const start = new Date(Date.now() - 28 * 86400000);

  const channelArrays = await Promise.all([
    stripeToChannels(uid),
    gscToChannels(uid),
    // Unified-API (Nango) category adapters — return [] until NANGO_SECRET_KEY + connections exist,
    // then light up automatically. This is the whole leverage of the normalized model.
    nangoCategoryToChannels(uid, "ecommerce"),
    nangoCategoryToChannels(uid, "ads"),
    nangoCategoryToChannels(uid, "pos"),
    nangoCategoryToChannels(uid, "accounting"),
  ]);
  const channels = channelArrays.flat();

  const totals = channels.reduce(
    (acc, c) => {
      const profit = c.profit ?? (c.revenue || 0) - (c.cost || 0);
      return {
        revenue: acc.revenue + (c.revenue || 0),
        cost: acc.cost + (c.cost || 0),
        profit: acc.profit + profit,
        sessions: acc.sessions + (c.sessions || 0),
      };
    },
    { revenue: 0, cost: 0, profit: 0, sessions: 0 }
  );

  return {
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
    channels,
    totals,
    generatedAt: new Date().toISOString(),
    // The roll-up can never claim more than its least-trustworthy input.
    provenance: channels.length ? worstProvenance(channels) : "measured",
  };
}
