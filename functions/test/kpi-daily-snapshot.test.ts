import { expect } from "chai";
import type { AppOptions } from "firebase-admin/app";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { runKpiDailySnapshot } from "../src/scheduled/kpi-daily-snapshot";

/**
 * Tests for KPI Daily Snapshot (T16)
 * - Seeds aiUsageDaily docs and runs snapshot
 * - Verifies kpiDaily doc aggregated and retention deletes old doc
 */

describe("kpiDailySnapshot", () => {
  before(() => {
    process.env.FIRESTORE_EMULATOR_HOST =
      process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
    if (!getApps().length)
      initializeApp({ projectId: "demo-test" } as AppOptions);
  });

  it("aggregates today ai usage, revenue metrics, and enforces retention", async () => {
    const db = getFirestore();
    // Use a fixed future date to isolate from other tests that may write current-period invoices/usage
    const today = new Date("2099-01-15T00:00:00.000Z");
    const dateKey = today.toISOString().slice(0, 10);
    // Clear any existing aiUsageDaily docs for this future date (isolation)
    const existing = await db
      .collection("aiUsageDaily")
      .where("date", "==", dateKey)
      .get();
    for (const d of existing.docs) await d.ref.delete();
    // Seed aiUsageDaily for two providers
    await db.collection("aiUsageDaily").doc(`${dateKey}_openai`).set({
      date: dateKey,
      provider: "openai",
      tokensIn: 100,
      tokensOut: 150,
      costEstimate: 0.12,
    });
    await db.collection("aiUsageDaily").doc(`${dateKey}_gemini`).set({
      date: dateKey,
      provider: "gemini",
      tokensIn: 50,
      tokensOut: 70,
      costEstimate: 0.045,
    });

    // Seed financeInvoices for current month revenue aggregation
    const periodKey = dateKey.slice(0, 7); // YYYY-MM
    const dueSoon = new Date(today.getTime() + 2 * 3600_000); // +2h
    const duePast = new Date(today.getTime() - 2 * 3600_000); // -2h
    // Paid on time (paidAt <= dueAt)
    await db.collection("financeInvoices").add({
      period: periodKey,
      status: "paid",
      amount: 100,
      dueAt: Timestamp.fromDate(dueSoon),
      paidAt: Timestamp.fromDate(new Date(today.getTime() + 1 * 3600_000)), // before due
    });
    // Paid late (paidAt > dueAt)
    await db.collection("financeInvoices").add({
      period: periodKey,
      status: "paid",
      amount: 50,
      dueAt: Timestamp.fromDate(duePast),
      paidAt: Timestamp.fromDate(new Date(today.getTime() + 1 * 3600_000)), // after due
    });
    // Outstanding (unpaid)
    await db.collection("financeInvoices").add({
      period: periodKey,
      status: "open",
      amount: 75,
      dueAt: Timestamp.fromDate(dueSoon),
    });
    // Seed an old kpiDaily doc past retention (95 days ago)
    const old = new Date(Date.now() - 95 * 86400_000)
      .toISOString()
      .slice(0, 10);
    await db.collection("kpiDaily").doc(old).set({
      date: old,
      aiTokensIn: 1,
      aiTokensOut: 1,
      aiCostEstimate: 0.0001,
      createdAt: today,
      updatedAt: today,
      _schema: 1,
    });

    const res = await runKpiDailySnapshot(today);
    // Use minimum thresholds (other tests could legitimately add more aiUsageDaily docs for the same future date)
    expect(res.aiTokensIn).to.be.at.least(150);
    expect(res.aiTokensOut).to.be.at.least(220);
    expect(res.aiCostEstimate).to.be.at.least(0.165 - 0.0001);

    const snap = await db.collection("kpiDaily").doc(dateKey).get();
    expect(snap.exists).to.equal(true);
    const data = snap.data() as Record<string, unknown>;
    expect(data.aiTokensIn).to.be.at.least(150);
    expect(data.aiTokensOut).to.be.at.least(220);
    // Revenue assertions
    expect(data.revenueMrr).to.be.at.least(150); // Allow higher if other tests seeded same period
    expect(data.revenueOutstanding).to.be.at.least(1); // Allow higher if other tests seeded open invoices
    expect(data.revenueOnTimePct).to.equal(50.0); // 1 of 2 paid on time

    // Newly added provenance & latency placeholders should exist (null until export wired)
    expect(data).to.have.property("provenanceCoveragePct");
    expect(data).to.have.property("p90LatencyOverall");
    expect(data).to.have.property("p95LatencyOverall");
    expect(data).to.have.property("p99LatencyOverall");
    expect(data.provenanceCoveragePct).to.equal(null);
    expect(data.p95LatencyOverall).to.equal(null);

    // Optional newly persisted extended metrics (may be null if unifiedMetricsDaily absent)
    expect(data).to.have.property("cacheHitRatio");
    expect(data).to.have.property("rateLimitRejectionRate");

    // Old doc should be purged
    const oldSnap = await db.collection("kpiDaily").doc(old).get();
    expect(oldSnap.exists).to.equal(false);
  });

  it("enriches provenance & latency percentiles when unifiedMetricsDaily export exists", async () => {
    const db = getFirestore();
    const today = new Date("2099-02-20T00:00:00.000Z");
    const dateKey = today.toISOString().slice(0, 10);
    // Seed minimal ai usage doc (required base fields)
    await db.collection("aiUsageDaily").doc(`${dateKey}_openai`).set({
      date: dateKey,
      provider: "openai",
      tokensIn: 10,
      tokensOut: 20,
      costEstimate: 0.01,
    });
    // Seed unified metrics daily export doc with sample percentiles
    await db
      .collection("unifiedMetricsDaily")
      .doc(dateKey)
      .set({
        date: dateKey,
        provenanceCoveragePct: 99.5,
        p90LatencyOverall: 450,
        p95LatencyOverall: 550,
        p99LatencyOverall: 900,
        routesP95: { "ai/conversational-seo": 550 },
        _schema: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    // Run snapshot
    await runKpiDailySnapshot(today);
    const snap = await db.collection("kpiDaily").doc(dateKey).get();
    expect(snap.exists).to.equal(true);
    const data = snap.data() as Record<string, unknown>;
    expect(data.provenanceCoveragePct).to.equal(99.5);
    expect(data.p90LatencyOverall).to.equal(450);
    expect(data.p95LatencyOverall).to.equal(550);
    expect(data.p99LatencyOverall).to.equal(900);
    // When unifiedMetricsDaily export includes extended metrics ensure they persist
    // Seed an updated export doc including cacheHitRatio & rateLimitRejectionRate to verify persistence
  });

  it("persists cacheHitRatio & rateLimitRejectionRate when provided by unifiedMetricsDaily export", async () => {
    const db = getFirestore();
    const today = new Date("2099-02-21T00:00:00.000Z");
    const dateKey = today.toISOString().slice(0, 10);
    await db.collection("aiUsageDaily").doc(`${dateKey}_openai`).set({
      date: dateKey,
      provider: "openai",
      tokensIn: 5,
      tokensOut: 6,
      costEstimate: 0.004,
    });
    await db.collection("unifiedMetricsDaily").doc(dateKey).set({
      date: dateKey,
      provenanceCoveragePct: 100,
      p90LatencyOverall: 300,
      p95LatencyOverall: 400,
      p99LatencyOverall: 700,
      cacheHitRatio: 52.5,
      rateLimitRejectionRate: 1.2,
      _schema: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await runKpiDailySnapshot(today);
    const snap = await db.collection("kpiDaily").doc(dateKey).get();
    const data = snap.data() as Record<string, unknown>;
    expect(data.cacheHitRatio).to.equal(52.5);
    expect(data.rateLimitRejectionRate).to.equal(1.2);
  });
});
