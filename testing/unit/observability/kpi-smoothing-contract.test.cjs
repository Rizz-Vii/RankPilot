/*
  Contract: kpiDailySnapshot persists exponential smoothing fields (smoothedProvenance, smoothedLatencyP95)
  Skips when Firestore isn't configured (no emulator or project id).
*/
require("ts-node/register");
const assert = require("assert");
const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const {
  runKpiDailySnapshot,
} = require("../../../functions/src/scheduled/kpi-daily-snapshot.ts");

describe("kpiDaily smoothing persistence", () => {
  const shouldSkip =
    !process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_CLOUD_PROJECT;
  before(function () {
    if (shouldSkip) this.skip();
  });

  let db;
  before(() => {
    if (!getApps().length) initializeApp();
    db = getFirestore();
  });
  it("persists smoothing fields on kpiDaily & kpiAlertsDaily", async () => {
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10);
    await runKpiDailySnapshot(today);
    const daily = await db.collection("kpiDaily").doc(dateKey).get();
    assert.ok(daily.exists, "kpiDaily doc exists");
    const d = daily.data();
    assert.ok("smoothedProvenance" in d, "smoothedProvenance field present");
    assert.ok("smoothedLatencyP95" in d, "smoothedLatencyP95 field present");
    assert.ok(
      "smoothedCrawlerAdoption" in d,
      "smoothedCrawlerAdoption field present"
    );
    assert.ok(
      "smoothedSemanticAdoption" in d,
      "smoothedSemanticAdoption field present"
    );
    const alerts = await db.collection("kpiAlertsDaily").doc(dateKey).get();
    assert.ok(alerts.exists, "kpiAlertsDaily doc exists");
    const a = alerts.data();
    assert.ok(
      "smoothedProvenance" in a,
      "smoothing field propagated to alerts snapshot"
    );
  });
});
