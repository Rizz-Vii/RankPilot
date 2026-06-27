/**
 * upsertFinanceInvoice — persists Stripe invoice data to Firestore financeInvoices collection.
 * Used by both the functions stripe-webhook handler and backfill scripts.
 */

import Stripe from "stripe";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) initializeApp();

export interface InvoiceUpsertOptions {
  allowUnpaid?: boolean;
  source?: string;
  requireTeamId?: string;
  dryRun?: boolean;
}

export async function upsertFinanceInvoice(
  invoice: Stripe.Invoice,
  options: InvoiceUpsertOptions = {}
): Promise<boolean> {
  const { allowUnpaid = false, dryRun = false } = options;

  if (!invoice.id) return false;

  // Skip non-paid invoices unless allowUnpaid is set
  if (!allowUnpaid && invoice.status !== "paid") return false;

  const db = getFirestore();

  // Look up user by stripeCustomerId
  const customerId = invoice.customer as string | undefined;
  let userId: string | null = null;
  if (customerId) {
    const snap = await db
      .collection("users")
      .where("stripeCustomerId", "==", customerId)
      .limit(1)
      .get();
    if (!snap.empty) userId = snap.docs[0].id;
  }

  const status = invoice.status ?? "open";
  const amount =
    ((invoice as any).amount_paid || invoice.amount_due || 0) / 100;
  const period = new Date(
    ((invoice as any).period_end ?? invoice.created ?? 0) * 1000
  )
    .toISOString()
    .slice(0, 7);

  const paidAt =
    status === "paid" && (invoice as any).status_transitions?.paid_at
      ? new Date((invoice as any).status_transitions.paid_at * 1000)
      : null;

  const payload: Record<string, unknown> = {
    invoiceId: invoice.id,
    stripeCustomerId: customerId ?? null,
    subscriptionId: (invoice as any).subscription ?? null,
    userId,
    status,
    amount,
    period,
    currency: invoice.currency,
    paidAt,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (dryRun) return true;

  const ref = db.collection("financeInvoices").doc(invoice.id);
  await ref.set(payload, { merge: true });

  // Set createdAt only on first write
  const existing = await ref.get();
  if (existing.exists && !existing.data()?.createdAt) {
    await ref.update({ createdAt: FieldValue.serverTimestamp() });
  } else if (!existing.exists) {
    await ref.update({ createdAt: FieldValue.serverTimestamp() });
  }

  return true;
}
