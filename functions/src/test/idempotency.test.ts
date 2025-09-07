import { strict as assert } from "assert";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  hasProcessedEvent,
  recordProcessedEvent,
  writeEvidence,
} from "../lib/billing/idempotency.js";

describe("stripe idempotency helpers", () => {
  before(() => {
    try {
      initializeApp({ credential: applicationDefault() });
    } catch {}
  });

  it("records and checks processed events", async () => {
    const db = getFirestore();
    const id = "evt_test_1";
    const before = await hasProcessedEvent(db, id);
    assert.equal(before, false);
    await recordProcessedEvent(db, id);
    const after = await hasProcessedEvent(db, id);
    assert.equal(after, true);
  });

  it("writes evidence documents without PII", async () => {
    const db = getFirestore();
    const id = "evt_test_2";
    await writeEvidence(db, {
      eventId: id,
      type: "invoice.payment_succeeded",
      invoiceId: "in_123",
      customerId: "cus_123",
      subscriptionId: "sub_123",
      status: "paid",
      requestId: "req_123",
    });
    const snap = await db
      .collection("billing_evidence")
      .where("eventId", "==", id)
      .limit(1)
      .get();
    assert.ok(!snap.empty, "evidence should be written");
    const doc = snap.docs[0].data();
    assert.equal(doc.type, "invoice.payment_succeeded");
    assert.equal(doc.customerId, "cus_123");
    assert.ok(!("email" in doc));
  });
});
