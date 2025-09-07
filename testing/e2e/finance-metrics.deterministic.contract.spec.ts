import { expect, test } from "@playwright/test";
import { seedDeterministicFinance } from "./utils/finance-seed";

// @contract @finance
test.describe("Finance metrics deterministic aggregation contract", () => {
  const email = "abbas_ali_rizvi@hotmail.com";

  test("exact MRR trend + delta after deterministic seeding", async ({
    request,
  }) => {
    const { periods } = await seedDeterministicFinance(request, email);
    let json: any = null;
    for (let i = 0; i < 5; i++) {
      const r = await request.get(
        `/api/finance/metrics?months=6&testUser=${encodeURIComponent(email)}`
      );
      if (r.ok()) json = await r.json();
      const series: Array<{ period: string; mrr: number }> =
        json?.mrrSeries || [];
      if (
        series.filter((s) => periods.includes(s.period)).length ===
        periods.length
      )
        break;
      await new Promise((res) => setTimeout(res, 200));
    }
    expect(json).toBeTruthy();
    const series: Array<{ period: string; mrr: number }> = json.mrrSeries || [];
    const seeded = series
      .filter((s) => periods.includes(s.period))
      .sort((a, b) => a.period.localeCompare(b.period));
    expect(seeded.length).toBe(periods.length);
    const amounts = seeded.map((r) => r.mrr).filter((v) => v > 0);
    // Support repeated runs (duplicate seeding multiplies amounts by constant factor)
    function gcd(a: number, b: number): number {
      return b === 0 ? a : gcd(b, a % b);
    }
    const baseGcd = amounts.reduce((a, b) => gcd(a, b));
    const normalized = amounts.map((a) => Math.round(a / baseGcd));
    expect(normalized).toEqual([1, 2, 3]);
    const kpis = json.kpis || [];
    const mrrKpi = kpis.find((k: any) => k.key === "mrr");
    expect(mrrKpi).toBeTruthy();
    if (mrrKpi) {
      const paidSeries = series
        .filter((s) => s.mrr > 0)
        .sort((a, b) => a.period.localeCompare(b.period));
      if (mrrKpi.value === 0) {
        // Current period has no paid invoices (expected with draft-only seed) => delta should be -100% relative to prior paid period
        if (paidSeries.length >= 1) {
          expect(Math.round(mrrKpi.delta)).toBe(-100);
        }
      } else if (paidSeries.length >= 2) {
        const last = paidSeries.at(-1)!;
        const prev = paidSeries.at(-2)!;
        const expectedDelta = ((last.mrr - prev.mrr) / prev.mrr) * 100;
        expect(Math.round(mrrKpi.value)).toBe(Math.round(last.mrr));
        expect(Math.round(mrrKpi.delta)).toBe(Math.round(expectedDelta));
      }
    }
    const outstandingKpi = kpis.find((k: any) => k.key === "outstanding");
    if (outstandingKpi) expect(outstandingKpi.value).toBeGreaterThanOrEqual(1);
  });
});
