import { expect } from "chai";
import * as admin from "firebase-admin";

// This test seeds an aiUsageDaily document and asserts /api/health returns aiDaily* KPI fields.
// Strengthens contract once daily persistence path exists.

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

describe("Health API - daily AI KPI fields", () => {
  const dateKey = new Date().toISOString().slice(0, 10);
  const docId = `${dateKey}_openai`;
  before(async () => {
    await db
      .collection("aiUsageDaily")
      .doc(docId)
      .set(
        {
          date: dateKey,
          provider: "openai",
          tokensIn: 123,
          tokensOut: 456,
          costEstimate: 0.789,
          models: { "gpt-4o": { tokensIn: 123, tokensOut: 456 } },
          testSeed: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  });

  it("exposes aiDaily* KPI fields populated from aiUsageDaily aggregates", async () => {
    const res = await fetch("http://localhost:3000/api/health");
    expect(res.ok).to.equal(true);
    const body = (await res.json()) as unknown;
    expect(body && typeof body === "object").to.equal(true);
    const kpis = (body as { kpis?: unknown }).kpis;
    expect(kpis && typeof kpis === "object").to.not.equal(undefined);
    const k = (kpis || {}) as Record<string, unknown>;
    expect(typeof k.aiDailyTokensIn).to.equal("number");
    expect(typeof k.aiDailyTokensOut).to.equal("number");
    expect(typeof k.aiDailyCostEstimate).to.equal("number");
    expect(k.aiDailyTokensIn as number).to.be.greaterThan(0);
    expect(k.aiDailyTokensOut as number).to.be.greaterThan(0);
    expect(k.aiDailyCostEstimate as number).to.be.greaterThan(0);
  });
});
