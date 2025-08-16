/*
  Tests: kpiDailySnapshot alert persistence (kpiAlertsDaily) & retention basics.
*/
require('ts-node/register');
const assert = require('assert');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
// Import runKpiDailySnapshot from functions source
const { runKpiDailySnapshot } = require('../../../functions/src/scheduled/kpi-daily-snapshot.ts');

describe('kpiAlertsDaily persistence', () => {
  let db;
  before(() => { if (!getApps().length) initializeApp(); db = getFirestore(); });
  it('creates alert doc with MA7 fields', async () => {
    const today = new Date();
    const dateKey = today.toISOString().slice(0,10);
    await runKpiDailySnapshot(today);
    const snap = await db.collection('kpiAlertsDaily').doc(dateKey).get();
    assert.ok(snap.exists, 'alert snapshot should exist');
    const data = snap.data();
    assert.ok('alerts' in data, 'alerts array present');
    assert.ok('ma7Provenance' in data, 'ma7Provenance present');
  });
});
