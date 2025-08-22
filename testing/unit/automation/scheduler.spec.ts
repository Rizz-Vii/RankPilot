import { expect } from 'chai';
import { describe, it } from 'mocha';
import sinon from 'sinon';

// We will import from compiled functions source to avoid emulator; we test logic via injected DB
import * as mod from '../../../functions/src/scheduled/run-due-automation';

interface DueDoc { id?: string;[k: string]: unknown }
interface FakeDbReturn {
    api: Record<string, unknown> & { collection: sinon.SinonStub };
    added: Record<string, unknown[]>;
    snap: { empty: boolean; docs: Array<{ id: string; data: () => unknown; ref: { update: sinon.SinonStub } }> };
}

function makeFakeDb(dueDocs: DueDoc[] = [], _collections: Record<string, string[]> = {}): FakeDbReturn {
    const added: Record<string, unknown[]> = {};
    const docs = dueDocs.map((d, i) => ({
        id: d.id || `r${i}`,
        data: () => d as unknown,
        ref: {
            update: sinon.stub().resolves()
        }
    }));
    const snap = { empty: docs.length === 0, docs };
    const whereStub = sinon.stub().returns({ orderBy: () => ({ limit: () => ({ get: async () => snap }) }) });
    // Sinon stub we expose as collection
    const colStub = sinon.stub().callsFake((name: string) => ({
        where: whereStub,
        add: async (obj: unknown) => { (added[name] ||= []).push(obj); return { id: `${name}-${(added[name] || []).length}` }; }
    }));
    return {
        api: { collection: colStub },
        added,
        snap
    };
}

describe('runDueAutomationTick', () => {
    it('processes due recipes and writes automationRuns', async () => {
        const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
        const db = makeFakeDb([
            { id: 'rec1', userId: 'u1', name: 'Test', active: true, schedule: { intervalMinutes: 60 }, actions: ['sendDigestEmail'], actionConfigs: { sendDigestEmail: { to: 'x@example.com' } }, nextRun: now },
        ]);
        // Patch runTransaction for locking success
        // attach runTransaction dynamically (test helper only)
        (db.api as Record<string, unknown>).runTransaction = async (fn: (txn: unknown) => unknown) => fn({ get: async () => ({ data: () => ({ running: false, lockedAt: null }) }), update: () => { /* no-op */ } });

        const res = await (mod as unknown as { runDueAutomationTick: (api: unknown, date: Date) => Promise<{ processed: number }> }).runDueAutomationTick(db.api, now);
        expect(res.processed).to.equal(1);
        // One emailQueue add + one automationRuns add expected
        const added = db.added;
        expect(added.emailQueue?.length).to.equal(1);
        expect(added.automationRuns?.length).to.equal(1);
    });

    it('skips inactive recipes', async () => {
        const now = new Date();
        const db = makeFakeDb([{ id: 'rec2', userId: 'u1', name: 'Inactive', active: false, schedule: {}, actions: [], nextRun: now }]);
        (db.api as Record<string, unknown>).runTransaction = async (fn: (txn: unknown) => unknown) => fn({ get: async () => ({ data: () => ({ running: false, lockedAt: null }) }), update: () => { /* no-op */ } });
        const res = await (mod as unknown as { runDueAutomationTick: (api: unknown, date: Date) => Promise<{ processed: number }> }).runDueAutomationTick(db.api, now);
        expect(res.processed).to.equal(0);
        const added = db.added;
        expect(added.automationRuns).to.equal(undefined);
    });
});
