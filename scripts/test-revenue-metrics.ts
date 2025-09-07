#!/usr/bin/env ts-node
/**
 * Lightweight unit assertions for revenue metrics formulas.
 * Run: npm run test:revenue-metrics
 */
import type { SubscriptionEvent } from "../src/lib/finance/revenue-metrics";
import { computeRevenueMetrics } from "../src/lib/finance/revenue-metrics";
import assert from "assert";

function almost(a: number | null, b: number | null, eps = 0.01) {
  if (a === null || b === null) assert.strictEqual(a, b, "Expected both null");
  else assert.ok(Math.abs(a - b) <= eps, `Expected ~${b} got ${a}`);
}

(function run() {
  const now = new Date();
  const startPrevMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );
  const canceledMidMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10)
  );

  const subs: SubscriptionEvent[] = [
    {
      userId: "u_active1",
      amountMonthly: 100,
      status: "active",
      startedAt: startPrevMonth,
    },
    {
      userId: "u_active2",
      amountMonthly: 50,
      status: "active",
      startedAt: startPrevMonth,
    },
    {
      userId: "u_churned",
      amountMonthly: 80,
      status: "canceled",
      startedAt: startPrevMonth,
      canceledAt: canceledMidMonth,
    },
    // Zero-churn scenario check (separate set)
  ];

  const snap = computeRevenueMetrics(subs, now);
  assert.strictEqual(snap.mrr, 150, "MRR sum of active amounts");
  assert.strictEqual(snap.arr, 1800, "ARR = MRR * 12");
  assert.strictEqual(
    snap.activeCustomers,
    2,
    "Active customers excludes canceled"
  );
  // Churn: 1 customer churned / 3 at start = 33.33%
  almost(snap.churnRatePct, 33.33, 0.05);
  // ARPU = 150 / 2 = 75
  almost(snap.arpu, 75, 0.01);
  // LTV = ARPU / (churnRateMonthly) = 75 / 0.3333 ~= 225
  almost(snap.ltv, 225, 1);

  // Zero churn scenario
  const subsZero: SubscriptionEvent[] = [
    {
      userId: "u1",
      amountMonthly: 30,
      status: "active",
      startedAt: startPrevMonth,
    },
    {
      userId: "u2",
      amountMonthly: 70,
      status: "active",
      startedAt: startPrevMonth,
    },
  ];
  const snapZero = computeRevenueMetrics(subsZero, now);
  assert.strictEqual(snapZero.mrr, 100);
  assert.strictEqual(snapZero.churnRatePct, 0);
  assert.strictEqual(snapZero.ltv, null, "LTV null when churn = 0");

  console.log("[revenue-metrics:test] PASS", { snap, snapZero });
})();
