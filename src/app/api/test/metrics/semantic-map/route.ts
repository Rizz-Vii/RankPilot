// Test-only route: increment semantic map aggregate adoption counters.
// Returns 404 in production.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  recordSemanticMapAggregateHit,
  recordSemanticMapLegacyFallback,
} from "@/lib/metrics/unified-metrics";
import { enforceProvenance } from "@/lib/middleware/provenance";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const disabledBody = enforceProvenance(
      { error: "Not available in production" },
      { path: "test/metrics/semantic-map", note: "disabled" }
    );
    return NextResponse.json(disabledBody, { status: 404 });
  }
  const url = new URL(req.url);
  const hits = Number(url.searchParams.get("hits") || "0");
  const fallbacks = Number(url.searchParams.get("fallbacks") || "0");
  for (let i = 0; i < hits; i++) recordSemanticMapAggregateHit();
  for (let i = 0; i < fallbacks; i++) recordSemanticMapLegacyFallback();
  const okBody = enforceProvenance(
    { ok: true, hitsIncremented: hits, fallbacksIncremented: fallbacks },
    { path: "test/metrics/semantic-map", note: "ok" }
  );
  return NextResponse.json(okBody);
}
