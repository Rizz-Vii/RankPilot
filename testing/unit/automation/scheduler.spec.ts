import { expect } from 'chai';
import { describe, it } from 'mocha';
import sinon from 'sinon';

// We will import from compiled functions source to avoid emulator; we test logic via injected DB
import * as mod from '../../../functions/src/scheduled/run-due-automation';

function makeFakeDb(dueDocs: any[] = [], collections: Record<string, string[]> = {}) {
    const added: Record<string, any[]> = {};
    const docs = dueDocs.map((d, i) => ({
        id: d.id || `r${i}`,
        data: () => d,
        ref: {
            update: sinon.stub().resolves()
        }
    }));
    const snap = { empty: docs.length === 0, docs };
    const whereStub = sinon.stub().returns({ orderBy: () => ({ limit: () => ({ get: async () => snap }) }) });
    const colStub: any = sinon.stub().callsFake((name: string) => {
        return {
            where: whereStub,
            add: async (obj: any) => { (added[name] ||= []).push(obj); return { id: `${name}-${(added[name] || []).length}` }; }
        };
    });
    return {
        api: { collection: colStub },
        added,
        snap,
    } as any;
}

describe('runDueAutomationTick', () => {
    it('processes due recipes and writes automationRuns', async () => {
        const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
        const db = makeFakeDb([
            { id: 'rec1', userId: 'u1', name: 'Test', active: true, schedule: { intervalMinutes: 60 }, actions: ['sendDigestEmail'], actionConfigs: { sendDigestEmail: { to: 'x@example.com' } }, nextRun: now },
        ]);
        // Patch runTransaction for locking success
        db.api.runTransaction = async (fn: any) => fn({ get: async () => ({ data: () => ({ running: false, lockedAt: null }) }), update: () => { } });

        const res = await (mod as any).runDueAutomationTick(db.api, now);
        expect(res.processed).to.equal(1);
        // One emailQueue add + one automationRuns add expected
        const added = (db as any).added;
        expect(added.emailQueue?.length).to.equal(1);
        expect(added.automationRuns?.length).to.equal(1);
    });

    it('skips inactive recipes', async () => {
        const now = new Date();
        const db = makeFakeDb([{ id: 'rec2', userId: 'u1', name: 'Inactive', active: false, schedule: {}, actions: [], nextRun: now }]);
        db.api.runTransaction = async (fn: any) => fn({ get: async () => ({ data: () => ({ running: false, lockedAt: null }) }), update: () => { } });
        const res = await (mod as any).runDueAutomationTick(db.api, now);
        expect(res.processed).to.equal(0);
        const added = (db as any).added;
        expect(added.automationRuns).to.equal(undefined);
    });
});
