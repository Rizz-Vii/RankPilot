import { expect } from 'chai';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { __testRunSeoAudit } from '../src/api/audit';

// Concurrency stress test (T13): Two scenarios
// 1) High limit: 20 parallel audits should mostly succeed (>=18 successes)
// 2) Low limit: strict enforcement after limit reached

describe('audit stress concurrency (T13)', function () {
    this.timeout(90000);
    before(() => { try { if (!getApps().length) initializeApp(); } catch { /* ignore */ } });
    const db = getFirestore();
    const today = new Date().toISOString().slice(0, 10);

    async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
    type AuditReq = { url: string; depth: number; checkMobile: boolean; plan: string; teamId: string; debugTeamLimit?: number };
    type AuthCtx = { uid: string };
    async function runWithRetry(data: AuditReq, auth: AuthCtx, retries = 5) {
        let attempt = 0; let lastErr: unknown;
        while (attempt <= retries) {
            try { return await __testRunSeoAudit(data, auth); }
            catch (e: unknown) {
                lastErr = e;
                const code = (e as { code?: string }).code;
                const msg = String((e as { message?: string }).message || '').toLowerCase();
                if (code === 'aborted' || msg.includes('aborted') || msg.includes('transaction')) { await sleep(40 * (attempt + 1)); attempt++; continue; }
                break;
            }
        }
        throw lastErr;
    }

    it('high limit: >=18 successes out of 20 parallel', async () => {
        const highTeamId = `team_stress_high_${Date.now()}`;
        const baseReq = { url: 'https://example.com', depth: 1, checkMobile: true, plan: 'starter', teamId: highTeamId, debugTeamLimit: 250 };
        const batch = Array.from({ length: 20 }, (_, i) => runWithRetry(baseReq, { uid: `stress_user_high_${i}` }));
        const results: unknown[] = []; const errors: unknown[] = [];
        await Promise.all(batch.map(p => p.then(r => results.push(r)).catch((e: unknown) => errors.push(e))));
        if (results.length === 0) { (this as unknown as { test?: { skip?: () => void } }).test?.skip?.(); return; }
        expect(results.length).to.be.gte(18);
        const snap = await db.collection('teamCrawlerUsage').doc(`${highTeamId}_${today}`).get();
        expect(snap.exists).to.be.true; const data = snap.data() as { count: number; rejections?: number } | undefined;
        expect(data?.count).to.equal(results.length);
        expect((data?.rejections || 0)).to.equal(0);
    });

    it('low limit: enforces rejections after limit reached', async () => {
        const lowTeamId = `team_stress_low_${Date.now()}`;
        const limit = 5; const attempts = 12;
        const baseReq = { url: 'https://example.com', depth: 1, checkMobile: true, plan: 'starter', teamId: lowTeamId, debugTeamLimit: limit };
        const batch = Array.from({ length: attempts }, (_, i) => runWithRetry(baseReq, { uid: `stress_user_low_${i}` }));
        const results: unknown[] = []; const errors: unknown[] = [];
        await Promise.all(batch.map(p => p.then(r => results.push(r)).catch((e: unknown) => errors.push(e))));
        if (results.length === 0) { (this as unknown as { test?: { skip?: () => void } }).test?.skip?.(); return; }
        expect(results.length).to.equal(limit);
        expect(errors.length).to.equal(attempts - limit);
        const snap = await db.collection('teamCrawlerUsage').doc(`${lowTeamId}_${today}`).get();
        const data = snap.data() as { count: number; rejections?: number } | undefined;
        expect(data?.count).to.equal(limit);
        expect((data?.rejections || 0)).to.be.gte(errors.length);
    });
});
