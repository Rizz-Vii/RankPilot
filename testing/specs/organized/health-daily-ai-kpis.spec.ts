import { test, expect, request } from "@playwright/test";

// Playwright spec: ensure aiDaily* KPI fields present after triggering real AI request or seeding.
// Strategy: hit seed endpoint for daily usage (admin route) then call /api/health.

const today = new Date().toISOString().slice(0, 10);

test.describe("Health API daily AI KPI presence", () => {
  test("exposes aiDaily* KPI fields after seeding daily usage", async () => {
    const ctx = await request.newContext();
    // Seed via admin endpoint (non-auth if no key set)
    await ctx.get(`/api/admin/ai-usage/daily?start=${today}&seed=1`);
    const res = await ctx.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.kpis).toBeDefined();
    ["aiDailyTokensIn", "aiDailyTokensOut", "aiDailyCostEstimate"].forEach(
      (k) => {
        expect(typeof body.kpis[k]).toBe("number");
        expect(body.kpis[k]).toBeGreaterThan(0);
      }
    );
  });
});
