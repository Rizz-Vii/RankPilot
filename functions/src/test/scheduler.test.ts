import { expect } from "chai";
import type { Firestore } from "firebase-admin/firestore";
import { describe, it } from "mocha";
import { runDueAutomationTick } from "../scheduled/run-due-automation";

// A very light Firestore double sufficient for our backoff path
function createDbDouble() {
  type Doc = Record<string, unknown>;
  const data: Record<string, Doc[]> = {
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
    add: async (doc: Doc) => {
      data[name].push({ ...doc, _id: `${name}_${data[name].length + 1}` });
      return { id: `${name}_${data[name].length}` };
    },
    where: (field: string, op: string, val: unknown) => ({
      orderBy: (_: string, __: string) => ({
        limit: (_n: number) => ({
          get: async () => {
            let arr = data[name];
            if (op === "<=") {
              arr = arr.filter((d: Doc) => {
                const v = (d as Record<string, unknown>)[field];
                if (v instanceof Date && val instanceof Date)
                  return v.getTime() <= val.getTime();
                if (typeof v === "number" && typeof val === "number")
                  return v <= val;
                if (typeof v === "string" && typeof val === "string")
                  return v <= val;
                return false;
              });
            }
            return {
              empty: arr.length === 0,
              docs: arr.map((d: Doc, idx: number) => ({
                id:
                  ((d as Record<string, unknown>).id as string) ||
                  `${name}_${idx + 1}`,
                data: () => d,
                ref: {
                  _doc: d,
                  update: async (u: Doc) => {
                    Object.assign(d, u);
                  },
                },
              })),
            };
          },
        }),
      }),
    }),
    doc: (id: string) => ({
      get: async () => ({
        exists: true,
        data: () =>
          data[name].find(
            (d: Doc) => String((d as Record<string, unknown>).id || "") === id
          ),
      }),
    }),
  });

  const db = {
    _data: data,
    collection: coll,
    runTransaction: async (
      fn: (tx: {
        get: (docRef: { _doc?: Doc }) => Promise<{ data: () => Doc | {} }>;
        update: (ref: unknown, u: unknown) => Promise<void>;
      }) => Promise<unknown>
    ) =>
      fn({
        get: async (docRef: { _doc?: Doc }) => ({
          data: () => docRef._doc || {},
        }),
        update: async (_ref: unknown, _u: unknown) => {
          /* noop for double */
        },
      }),
  };
  return db;
}

describe("Scheduler backoff", () => {
  it("increments failureCount and schedules backoff on action errors", async () => {
    const db = createDbDouble();
    // Force sendDigestEmail action to error by throwing on emailQueue.add
    const origCollection = db.collection;
    db.collection = (name: string) => {
      const c = origCollection(name);
      if (name === "emailQueue") {
        return {
          ...c,
          add: async (_doc: unknown) => {
            throw new Error("forced");
          },
        };
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

    const res = await runDueAutomationTick(db as unknown as Firestore, now);
    expect(res.processed).to.equal(1);
    const recipe = (
      db as unknown as { _data: Record<string, Record<string, unknown>[]> }
    )._data.automationRecipes[0] as Record<string, unknown>;
    expect(recipe.failureCount).to.equal(1);
    const nr = recipe.nextRun as unknown;
    const nrDate = nr instanceof Date ? nr : new Date(String(nr));
    expect(nrDate.getTime()).to.be.greaterThan(now.getTime());
    expect(db._data.schedulerFailures.length).to.equal(1);
    expect(db._data.automationRuns.length).to.equal(1);
  });
});
