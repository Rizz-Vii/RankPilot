/**
 * Health endpoint: exposes minimal telemetry and crawler KPIs.
 * - Crawler: success vs errors, fallback rate, p95/p99
 * - AI provenance coverage summary
 * - Rate limit rejection totals
 */
import { NextResponse } from "next/server";
import { getUnifiedMetricsSnapshot } from "@/lib/metrics/unified-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snap = getUnifiedMetricsSnapshot();
  const c =
    snap.crawler ||
    ({ success: 0, errors: 0, crawlP95: null, crawlP99: null } as any);
  const total = (c.success || 0) + (c.errors || 0);
  const fallbackRatePct =
    total === 0 ? 0 : +(((c.errors || 0) / total) * 100).toFixed(2);

  const body = {
    ok: true,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    crawler: {
      success: c.success || 0,
      errors: c.errors || 0,
      fallbackRatePct,
      crawlP95: c.crawlP95 ?? null,
      crawlP99: c.crawlP99 ?? null,
    },
    ai: {
      responses: snap.aiResponses.total,
      coveragePct: snap.aiResponses.coveragePct,
    },
    rateLimit: {
      rejectionsTotal: Object.values(snap.rateLimitRejections || {}).reduce(
        (a, b) => a + (b || 0),
        0
      ),
    },
  };

  const res = NextResponse.json(body, { status: 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
