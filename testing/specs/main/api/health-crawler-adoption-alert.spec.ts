import { expect, request, test } from "@playwright/test";

// Verifies crawler aggregate adoption KPI & alert thresholds.
// Thresholds: critical <50, warn 50-<80, none >=80

test.describe("Health API crawler aggregate adoption alerts", () => {
  test("adoption alert transitions warn -> cleared", async () => {
    const ctx = await request.newContext();
    const getNumber = (v: unknown): number => (typeof v === "number" ? v : 0);
    const parseCrawler = (data: unknown) => {
      if (!data || typeof data !== "object")
        return {
          hits: 0,
          fallbacks: 0,
          adoption: 0,
          alerts: [] as Array<{ type?: string; level?: string }>,
        };
      const root = data as Record<string, unknown>;
      const kpis =
        root.kpis && typeof root.kpis === "object"
          ? (root.kpis as Record<string, unknown>)
          : undefined;
      const crawler =
        kpis && kpis.crawler && typeof kpis.crawler === "object"
          ? (kpis.crawler as Record<string, unknown>)
          : undefined;
      const alerts = Array.isArray(root.alerts)
        ? (root.alerts as Array<{ type?: string; level?: string }>)
        : [];
      return {
        hits: getNumber(crawler?.aggregateHits),
        fallbacks: getNumber(crawler?.legacyFallbacks),
        adoption: getNumber(kpis?.crawlerAggregateAdoptionPct),
        alerts,
      };
    };
    // Validate lightweight probe metadata (version/buildSha/uptime) before heavy polling
    try {
      const simple = await ctx.get("/api/health/simple");
      if (simple.ok()) {
        const meta = await simple.json();
        if (meta.ok) {
          ["version", "buildSha", "uptimeMs"].forEach((f) => {
            if (!(f in meta)) throw new Error(`missing field ${f}`);
          });
        }
      }
    } catch {
      /* non-fatal */
    }
    // Baseline current counters
    const baselineRes = await ctx.get("/api/health");
    const baselineParsed = parseCrawler(await baselineRes.json());
    const baseHits = baselineParsed.hits;
    // Add small balanced increments pushing adoption toward mid zone (warn range 50-<80)
    await ctx.get("/api/test/metrics/crawler?hits=2&fallbacks=2");
    // Poll for updated KPI
    let midParsed = baselineParsed;
    for (let i = 0; i < 6; i++) {
      const r = await ctx.get("/api/health");
      midParsed = parseCrawler(await r.json());
      if (midParsed.hits > baseHits) break;
      await new Promise((r2) => setTimeout(r2, 120));
    }
    expect(midParsed.adoption).toBeGreaterThanOrEqual(50 - 0.0001);
    expect(midParsed.adoption).toBeLessThan(80);
    const warn = midParsed.alerts.find(
      (a) => a.type === "crawlerAggregateAdoption"
    );
    expect(warn).toBeDefined();
    expect(warn && warn.level).toBe("warn");
    // Compute additional hits needed to exceed 80%: solve (hitsMid + x) / (hitsMid + x + fallbacksMid) >= 0.81 => x >= (0.81*fallbacksMid - 0.19*hitsMid)/0.19
    const needed = Math.max(
      1,
      Math.ceil((0.81 * midParsed.fallbacks - 0.19 * midParsed.hits) / 0.19)
    );
    await ctx.get(`/api/test/metrics/crawler?hits=${needed}&fallbacks=0`);
    // Poll again
    let highParsed = midParsed;
    for (let i = 0; i < 6; i++) {
      const r = await ctx.get("/api/health");
      highParsed = parseCrawler(await r.json());
      if (highParsed.adoption > 80) break;
      await new Promise((r2) => setTimeout(r2, 120));
    }
    expect(highParsed.adoption).toBeGreaterThan(80);
    const adoptionAlerts = highParsed.alerts.filter(
      (a) => a.type === "crawlerAggregateAdoption"
    );
    expect(adoptionAlerts.length).toBe(0);
  });
});
