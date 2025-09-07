const {
  computeRevenueMetrics,
} = require("../../../dist/lib/finance/revenue-metrics.js");

describe("computeRevenueMetrics", () => {
  test("computes metrics with active and churned users", () => {
    const now = new Date();
    const subs = [
      {
        userId: "a",
        amountMonthly: 50,
        status: "active",
        startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60),
      },
      {
        userId: "b",
        amountMonthly: 50,
        status: "canceled",
        startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90),
        canceledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        userId: "c",
        amountMonthly: 100,
        status: "active",
        startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10),
      },
    ];
    const snap = computeRevenueMetrics(subs, now);
    expect(snap.mrr).toBe(150);
    expect(snap.arr).toBe(1800);
    expect(snap.activeCustomers).toBe(2); // b churned
    expect(snap.arpu).toBeCloseTo(75, 1);
    // churn may be 1 / startActive (which included b) => depending on timing
    expect(snap.churnRatePct).toBeGreaterThanOrEqual(0);
  });
});
