/**
 * Stripe webhook idempotency + evidence helpers.
 *
 * Stripe may deliver the same event more than once (retries, at-least-once
 * delivery). These helpers ensure each event is processed at most once and
 * persist an audit trail ("evidence") for every processed event.
 */

import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

const PROCESSED_COLLECTION = "stripeProcessedEvents";
const EVIDENCE_COLLECTION = "stripeWebhookEvidence";

/** Returns true if the given Stripe event id has already been processed. */
export async function hasProcessedEvent(
  db: Firestore,
  eventId: string
): Promise<boolean> {
  if (!eventId) return false;
  const snap = await db.collection(PROCESSED_COLLECTION).doc(eventId).get();
  return snap.exists;
}

/** Marks a Stripe event id as processed. Idempotent (merge write). */
export async function recordProcessedEvent(
  db: Firestore,
  eventId: string
): Promise<void> {
  if (!eventId) return;
  await db
    .collection(PROCESSED_COLLECTION)
    .doc(eventId)
    .set(
      { eventId, processedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
}

export interface WebhookEvidence {
  eventId: string;
  type: string;
  subscriptionId?: string;
  customerId?: string;
  invoiceId?: string;
  status?: string;
  requestId?: string | null;
}

/**
 * Persists an audit-trail "evidence" record for a processed webhook event.
 * Keyed by eventId so re-deliveries overwrite rather than duplicate.
 */
export async function writeEvidence(
  db: Firestore,
  evidence: WebhookEvidence
): Promise<void> {
  if (!evidence?.eventId) return;
  await db
    .collection(EVIDENCE_COLLECTION)
    .doc(evidence.eventId)
    .set(
      {
        ...evidence,
        recordedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}
