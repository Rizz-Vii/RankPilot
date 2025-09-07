import { test, expect, request } from "@playwright/test";

// Contract Test: /api/health aiUsage24h & subtoolUsage24h schema
// Ensures presence of new telemetry fields and basic shape invariants.

test.describe("Health API AI Usage Contract", () => {
  test("returns aiUsage24h & subtoolUsage24h with expected shape", async () => {
    const ctx = await request.newContext();
    const res = await ctx.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("aiUsage24h");
    expect(body.aiUsage24h).toHaveProperty("tokensIn");
    expect(body.aiUsage24h).toHaveProperty("tokensOut");
    expect(body.aiUsage24h).toHaveProperty("costEstimate");
    // Non-negative numeric fields
    ["tokensIn", "tokensOut"].forEach((k) =>
      expect(typeof body.aiUsage24h[k]).toBe("number")
    );
    expect(body.aiUsage24h.tokensIn).toBeGreaterThanOrEqual(0);
    expect(body.aiUsage24h.tokensOut).toBeGreaterThanOrEqual(0);
    expect(typeof body.aiUsage24h.costEstimate).toBe("number");
    expect(body.aiUsage24h.costEstimate).toBeGreaterThanOrEqual(0);
    // subtoolUsage24h is a record<string, number>
    expect(body).toHaveProperty("subtoolUsage24h");
    const su = body.subtoolUsage24h || {};
    Object.entries(su).forEach(([k, v]) => {
      expect(typeof k).toBe("string");
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(0);
    });
    if (body.kpis) {
      ["aiDailyTokensIn", "aiDailyTokensOut", "aiDailyCostEstimate"].forEach(
        (f) => {
          if (f in body.kpis) expect(body.kpis[f]).toBeGreaterThanOrEqual(0);
        }
      );
    }
  });
});
