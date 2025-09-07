import { expect } from "chai";
import type { AppOptions } from "firebase-admin/app";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { runDueAutomationTick } from "../src/scheduled/run-due-automation";

/**
 * Emulator-backed tests for scheduler: happy-path and backoff.
 * Requires Firestore emulator from firebase.json (port 8080). Run via `npm --prefix functions run test` or emulator exec.
 */

describe("Scheduler emulator tests", function () {
  this.timeout(20000);

  before(() => {
    process.env.FIRESTORE_EMULATOR_HOST =
      process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
    if (!getApps().length) {
      // Initialize without credentials when using emulator
      initializeApp({ projectId: "demo-test" } as AppOptions);
    }
  });

  it("happy path: processes sendDigestEmail and writes automationRuns", async () => {
    const db = getFirestore();
    const now = new Date();
    const ref = db.collection("automationRecipes").doc("sched_happy");
    await ref.set({
      userId: "u1",
      name: "Happy",
      active: true,
      schedule: {},
      actions: ["sendDigestEmail"],
      nextRun: now,
    });
    const res = await runDueAutomationTick(db, now);
    // Processed count may exceed 1 if other due recipes seeded by parallel tests; assert at least one processed.
    expect(res.processed).to.be.greaterThan(0);
    const runSnap = await db
      .collection("automationRuns")
      .where("recipeId", "==", "sched_happy")
      .get();
    expect(runSnap.empty).to.equal(false);
  });

  it("backoff path: forced error increments failureCount and schedules nextRun in future", async () => {
    const db = getFirestore();
    const now = new Date();
    process.env.SCHEDULER_TEST_MODE = "1";
    const ref = db.collection("automationRecipes").doc("sched_backoff");
    await ref.set({
      userId: "u2",
      name: "Backoff",
      active: true,
      schedule: {},
      actions: ["testForceError"],
      failureCount: 0,
      nextRun: now,
    });

    await runDueAutomationTick(db, now);
    const snap = await ref.get();
    const data = snap.data() as Record<string, unknown>;
    expect(data.running).to.equal(false);
    expect(typeof data.failureCount).to.equal("number");
    expect(data.failureCount).to.be.greaterThan(0);
    const next = data.nextRun as { toDate?: () => Date } | Date | undefined;
    const nextDate =
      next &&
      typeof next === "object" &&
      "toDate" in next &&
      typeof (next as { toDate?: unknown }).toDate === "function"
        ? (next as { toDate: () => Date }).toDate()
        : (next as Date | undefined);
    expect(nextDate instanceof Date).to.equal(true);
    expect((nextDate as Date).getTime()).to.be.greaterThan(now.getTime());
  });
});
