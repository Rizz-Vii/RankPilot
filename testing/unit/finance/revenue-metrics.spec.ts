import { strict as assert } from "assert";
import type { SubscriptionEvent } from "@/lib/finance/revenue-metrics";
import { computeRevenueMetrics } from "@/lib/finance/revenue-metrics";

describe("computeRevenueMetrics", () => {
  it("computes MRR, ARR, churn, LTV with mixed subscriptions", () => {
    const now = new Date();
    const subs: SubscriptionEvent[] = [
      {
        userId: "u1",
        amountMonthly: 50,
        status: "active",
        startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 70),
      },
      {
        userId: "u2",
        amountMonthly: 50,
        status: "canceled",
        startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 95),
        canceledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        userId: "u3",
        amountMonthly: 100,
        status: "active",
        startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10),
      },
    ];
    const snap = computeRevenueMetrics(subs, now);
    assert.equal(snap.mrr, 150);
    assert.equal(snap.arr, 1800);
    assert.equal(snap.activeCustomers, 2); // u2 churned
    assert.ok(snap.churnRatePct >= 0 && snap.churnRatePct <= 100);
    if (snap.ltv != null) assert.ok(snap.ltv > 0);
  });
});
