import { expect, request, test } from "@playwright/test";
/*
 * Contract: Before enabling destructive pruning we expect aggregate adoption >= REQUIRED_THRESHOLDS.
 * This spec ensures crawler & semantic map adoption percentages reported by /api/health (or approximated via test metrics seeding) can reach threshold.
 * Threshold constants mirror planned prune gate (≥95%).
 */
const CRAWLER_TARGET = 95; // %
const SEMANTIC_TARGET = 95; // %
type HealthContext = {
  get: (path: string) => Promise<{ json: () => Promise<unknown> }>;
};
const parseAdoption = (body: unknown, key: "crawler" | "semantic") => {
  if (!body || typeof body !== "object") return 0;
  const root = body as Record<string, unknown>;
  const kpisRaw = root["kpis"];
  const kpis =
    kpisRaw && typeof kpisRaw === "object"
      ? (kpisRaw as Record<string, unknown>)
      : undefined;
  const crawlerValRaw =
    kpis && typeof kpis["crawlerAggregateAdoptionPct"] === "number"
      ? kpis["crawlerAggregateAdoptionPct"]
      : undefined;
  const semanticValRaw =
    kpis && typeof kpis["semanticMapAggregateAdoptionPct"] === "number"
      ? kpis["semanticMapAggregateAdoptionPct"]
      : undefined;
  return key === "crawler"
    ? (crawlerValRaw as number) || 0
    : (semanticValRaw as number) || 0;
};
async function pushCrawlerAdoption(ctx: HealthContext, target: number) {
  for (let i = 0; i < 12; i++) {
    const res = await ctx.get("/api/health");
    const body = await res.json();
    const pct = parseAdoption(body, "crawler");
    if (pct >= target) return pct;
    await ctx.get(
      "/api/test/metrics/crawler?hits=10&fallbacks=0&domain=crawler"
    );
  }
  const finalRes = await ctx.get("/api/health");
  return parseAdoption(await finalRes.json(), "crawler");
}

test.describe("NeuroSEO adoption prune threshold readiness", () => {
  test("crawler adoption can reach prune threshold (≥95%)", async () => {
    const ctx = await request.newContext();
    await ctx.get(
      "/api/test/metrics/crawler?hits=5&fallbacks=5&domain=crawler"
    );
    const pct = await pushCrawlerAdoption(ctx, CRAWLER_TARGET);
    expect(pct).toBeGreaterThanOrEqual(CRAWLER_TARGET - 0.0001);
  });
  async function pushSemanticAdoption(ctx: HealthContext, target: number) {
    // Strategy: seed denominator (balanced hits/fallbacks) then add only aggregate hits until threshold.
    for (let i = 0; i < 14; i++) {
      const res = await ctx.get("/api/health");
      const pct = parseAdoption(await res.json(), "semantic");
      if (pct >= target) return pct;
      await ctx.get(
        "/api/test/metrics/crawler?hits=10&fallbacks=0&domain=semantic"
      );
    }
    const finalRes = await ctx.get("/api/health");
    return parseAdoption(await finalRes.json(), "semantic");
  }
  test("semantic map adoption can reach prune threshold (≥95%)", async () => {
    const ctx = await request.newContext();
    // Seed initial denominator to avoid NaN/null (ensure both aggregate + legacy present)
    await ctx.get(
      "/api/test/metrics/crawler?hits=5&fallbacks=5&domain=semantic"
    );
    const pct = await pushSemanticAdoption(ctx, SEMANTIC_TARGET);
    expect(pct).toBeGreaterThanOrEqual(SEMANTIC_TARGET - 0.0001);
  });
});
