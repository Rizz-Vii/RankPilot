/**
 * Shared invoice upsert utility (scaffold).
 * NOTE: Payment/Stripe logic is intentionally simple here; unification task will
 * replace route-local implementation once reviewed. Avoid heavy mutations.
 */
// Note: Using relative imports because script context may not apply tsconfig path aliases.
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { getLogger } from "../../src/lib/logging/app-logger";

export interface MinimalStripeInvoiceLike {
  id: string;
  customer?: string | null;
  period_end?: number;
  created: number;
  status?: string | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  due_date?: number | null;
  status_transitions?: { paid_at?: number | null };
  lines?: { data?: unknown[] };
  metadata?: Record<string, unknown>;
  currency?: string;
}

export async function upsertFinanceInvoice(invoice: MinimalStripeInvoiceLike) {
  const logger = getLogger("stripe-invoice-util");
  try {
    const customerId = invoice.customer as string | undefined;
    if (!customerId) return;
    const usersQ = query(
      collection(db, "users"),
      where("stripeCustomerId", "==", customerId)
    );
    const snap = await getDocs(usersQ);
    if (snap.empty) return;
    const userId = snap.docs[0].id;
    const period = new Date((invoice.period_end || invoice.created) * 1000)
      .toISOString()
      .slice(0, 7);
    const status = invoice.status || "open";
    const amount = (invoice.amount_paid || invoice.amount_due || 0) / 100;
    const issuedAt = new Date(invoice.created * 1000);
    const dueAt = invoice.due_date ? new Date(invoice.due_date * 1000) : null;
    const paidAt =
      invoice.status === "paid" && invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null;
    const firstLineUnknown = invoice.lines?.data?.[0] as unknown;
    const firstLine =
      firstLineUnknown && typeof firstLineUnknown === "object"
        ? (firstLineUnknown as Record<string, unknown>)
        : undefined;
    const price =
      firstLine &&
      typeof firstLine.price === "object" &&
      firstLine.price !== null
        ? (firstLine.price as Record<string, unknown>)
        : undefined;
    const priceMeta =
      price && typeof price.metadata === "object" && price.metadata !== null
        ? (price.metadata as Record<string, unknown>)
        : undefined;
    const planTierFromLine =
      priceMeta && typeof priceMeta.planTier === "string"
        ? priceMeta.planTier
        : undefined;
    const planTierFromMeta =
      invoice.metadata && typeof invoice.metadata.planTier === "string"
        ? invoice.metadata.planTier
        : undefined;
    const planTier = planTierFromLine || planTierFromMeta || null;
    const ref = doc(db, "financeInvoices", invoice.id);
    await setDoc(
      ref,
      {
        userId,
        period,
        amount,
        status,
        issuedAt,
        dueAt,
        paidAt,
        planTier,
        currency: invoice.currency,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
      { merge: true }
    );
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: unknown }).message)
        : String(e);
    logger.degraded("invoice.upsert.failed", {
      invoiceId: invoice.id,
      error: message,
    });
  }
}

// Future: Add idempotent guard + hash verification with Functions variant.
