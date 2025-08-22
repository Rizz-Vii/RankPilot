import { expect } from 'chai';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { describe, it } from 'mocha';
import { runKpiDailySnapshot } from '../scheduled/kpi-daily-snapshot';

// Contract test: ensures kpiDailySnapshot persists provenance & latency percentile fields (even null) without throwing.

describe('kpiDailySnapshot contract', () => {
    it('writes doc with provenance & latency percentile fields', async () => {
        if (!getApps().length) initializeApp();
        const db = getFirestore();
        const date = new Date('2025-08-15T00:00:00Z');
        const res = await runKpiDailySnapshot(date);
        expect(res).to.have.property('date');
        const doc = await db.collection('kpiDaily').doc(res.date).get();
        expect(doc.exists).to.be.true;
        const data = doc.data() as Record<string, unknown>;
        expect('provenanceCoveragePct' in data).to.be.true;
        expect('p95LatencyOverall' in data).to.be.true;
        expect('p99LatencyOverall' in data).to.be.true;
        expect('ma7Provenance' in data).to.be.true;
        // Accept null values; presence is the contract.
        expect('provenanceCoveragePct' in data).to.be.true;
    });

    it('purges docs older than retention window (kpiDaily & kpiAlertsDaily)', async () => {
        if (!getApps().length) initializeApp();
        const db = getFirestore();
        // Seed an old doc 100 days in the past (beyond 90d retention)
        const past = new Date(Date.UTC(2025, 4, 1)); // 2025-05-01
        const pastKey = past.toISOString().slice(0, 10);
        await db.collection('kpiDaily').doc(pastKey).set({ date: pastKey, aiTokensIn: 0, aiTokensOut: 0, aiCostEstimate: 0, createdAt: new Date(), updatedAt: new Date(), _schema: 1 });
        await db.collection('kpiAlertsDaily').doc(pastKey).set({ date: pastKey, alerts: [], createdAt: new Date(), updatedAt: new Date() });
        // Run snapshot for current date (will trigger retention purge)
        const now = new Date('2025-08-15T00:00:00Z');
        await runKpiDailySnapshot(now);
        const oldDaily = await db.collection('kpiDaily').doc(pastKey).get();
        const oldAlerts = await db.collection('kpiAlertsDaily').doc(pastKey).get();
        // Allow race where batch limit skipped if window small; assert best-effort deletion OR retention skip log path
        expect(oldDaily.exists, 'old kpiDaily doc should be purged').to.be.false;
        expect(oldAlerts.exists, 'old kpiAlertsDaily doc should be purged').to.be.false;
    });
});
