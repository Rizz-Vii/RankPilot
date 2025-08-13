import { expect } from "chai";
import { describe, it } from "mocha";
import { runDueAutomationTick } from "../scheduled/run-due-automation";

// A very light Firestore double sufficient for our backoff path
function createDbDouble() {
    const data: Record<string, any[]> = {
        automationRecipes: [],
        automationRuns: [],
        schedulerFailures: [],
        emailQueue: [],
        salesMetricsSnapshots: [],
        salesForecastSnapshots: [],
        financeRevenueSnapshots: [],
        financeInvoiceAgingSummaries: [],
        salesDeals: [],
        financeInvoices: [],
    };

    const coll = (name: string) => ({
        _name: name,
        add: async (doc: any) => { data[name].push({ ...doc, _id: `${name}_${data[name].length + 1}` }); return { id: `${name}_${data[name].length}` }; },
        where: (field: string, op: string, val: any) => ({
            orderBy: (_: string, __: string) => ({
                limit: (_n: number) => ({
                    get: async () => {
                        let arr = data[name];
                        if (op === "<=") arr = arr.filter((d: any) => (d as any)[field] <= val);
                        return {
                            empty: arr.length === 0,
                            docs: arr.map((d: any, idx: number) => ({
                                id: (d as any).id || `${name}_${idx + 1}`,
                                data: () => d,
                                ref: {
                                    _doc: d,
                                    update: async (u: any) => { Object.assign(d, u); },
                                },
                            })),
                        } as any;
                    },
                }),
            }),
        }),
        doc: (id: string) => ({ get: async () => ({ exists: true, data: () => data[name].find((d: any) => (d.id || "") === id) }) }),
    });

    return {
        _data: data,
        collection: coll,
        runTransaction: async (fn: any) => fn({
            get: async (docRef: any) => ({ data: () => docRef._doc || {} }),
            update: async (_ref: any, _u: any) => { /* noop for double */ },
        }),
    } as any;
}

describe("Scheduler backoff", () => {
    it("increments failureCount and schedules backoff on action errors", async () => {
        const db = createDbDouble();
        // Force sendDigestEmail action to error by throwing on emailQueue.add
        const origCollection = db.collection;
        db.collection = (name: string) => {
            const c = origCollection(name);
            if (name === "emailQueue") {
                return { ...c, add: async (_doc: any) => { throw new Error("forced"); } };
            }
            return c;
        };
        const now = new Date("2025-08-12T00:00:00Z");
        db._data.automationRecipes.push({
            id: "r1",
            userId: "u1",
            active: true,
            schedule: { intervalMinutes: 15 },
            actions: ["sendDigestEmail", "unknownActionCausesError"],
            nextRun: now,
            running: false,
            lockedAt: null,
            failureCount: 0,
        });

        const res = await runDueAutomationTick(db, now);
        expect(res.processed).to.equal(1);
        const recipe = db._data.automationRecipes[0];
        expect(recipe.failureCount).to.equal(1);
        expect(new Date(recipe.nextRun).getTime()).to.be.greaterThan(now.getTime());
        expect(db._data.schedulerFailures.length).to.equal(1);
        expect(db._data.automationRuns.length).to.equal(1);
    });
});
