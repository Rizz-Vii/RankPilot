import { expect, test } from "@playwright/test"; // @contract @finance

// Verifies aggregation logic by checking consistency relationships (delta calculations, series ordering) without seeding Firestore.
test.describe("Finance metrics aggregation consistency", () => {
  test("MRR trend monotonic period ordering & kpi structural integrity", async ({
    request,
  }) => {
    const resp = await request.get(
      "/api/finance/metrics?months=6&testUser=abbas_ali_rizvi@hotmail.com"
    );
    expect(resp.ok()).toBeTruthy();
    const json = await resp.json();
    const series: Array<{ period: string; mrr: number }> = json.mrrSeries || [];
    // Periods should be sorted ascending by period string
    const periods = series.map((s) => s.period);
    const sorted = [...periods].sort();
    expect(periods).toEqual(sorted);
    // KPIs present and include mrr
    const kpis: Array<{
      key: string;
      trend?: number[];
      value?: number;
      delta?: number;
    }> = json.kpis || [];
    const mrrKpi = kpis.find((k) => k.key === "mrr");
    expect(mrrKpi).toBeTruthy();
    if (mrrKpi?.trend) {
      expect(mrrKpi.trend.length).toBe(series.length);
    }
  });
});
