import { expect } from 'chai';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { describe, it } from 'mocha';
import { runKpiDailySnapshot } from '../src/scheduled/kpi-daily-snapshot';

describe('kpiDailySnapshot MA7 contract', () => {
    it('persists MA7 overlay fields (numeric or null) for last 7 days', async () => {
        if (!getApps().length) initializeApp();
        const db = getFirestore();
        const base = new Date('2025-08-15T00:00:00Z');
        for (let i = 6; i >= 0; i--) {
            const d = new Date(base.getTime() - i * 86400_000);
            await runKpiDailySnapshot(d);
        }
        const snap = await db.collection('kpiDaily').orderBy('date', 'desc').limit(7).get();
        expect(snap.empty).to.be.false;
        const fields = ['ma7Provenance', 'ma7CrawlerAdoption', 'ma7SemanticAdoption', 'ma7FallbackRate', 'ma7LatencyP95', 'ma7CacheHitRatio', 'ma7RateLimitRejectionRate'];
        snap.docs.forEach(doc => {
            const data = doc.data() as Record<string, unknown>;
            fields.forEach(f => {
                const val = data[f];
                expect(f in data, `${f} missing on ${doc.id}`).to.be.true;
                if (val !== null) expect(typeof val).to.equal('number');
            });
        });
    });
});
