// Finance Automation Snapshot fetchers
// Collections: financeRevenueSnapshots, financeInvoiceAgingSummaries
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { z } from "zod";

export interface FinanceRevenueSnapshotDoc {
  id: string;
  userId: string;
  teamId?: string | null;
  period: string; // YYYY-MM
  mrr: number;
  onTimePct: number;
  outstanding: number;
  createdAt?: unknown;
}

export interface FinanceInvoiceAgingSummaryDoc {
  id: string;
  userId: string;
  teamId?: string | null;
  buckets: { "0-30": number; "31-60": number; "61-90": number; "90+": number };
  createdAt?: unknown;
}

const revenueSnapshotSchema = z.object({
  period: z.string(),
  mrr: z.number(),
  onTimePct: z.number(),
  outstanding: z.number(),
  createdAt: z.any().optional(),
  userId: z.string().optional(),
  teamId: z.string().nullable().optional(),
});

const invoiceAgingSchema = z.object({
  buckets: z.object({
    "0-30": z.number(),
    "31-60": z.number(),
    "61-90": z.number(),
    "90+": z.number(),
  }),
  createdAt: z.any().optional(),
  userId: z.string().optional(),
  teamId: z.string().nullable().optional(),
});

function scopeField(teamId?: string) {
  return teamId ? "teamId" : "userId";
}

export async function fetchRecentFinanceRevenueSnapshots(
  userId: string,
  teamId?: string,
  max = 12
): Promise<FinanceRevenueSnapshotDoc[]> {
  const q = query(
    collection(db, "financeRevenueSnapshots"),
    where(scopeField(teamId), "==", teamId || userId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const raw = { id: d.id, ...data };
    const parsed = revenueSnapshotSchema.safeParse(raw);
    return parsed.success
      ? (parsed.data as FinanceRevenueSnapshotDoc)
      : (raw as FinanceRevenueSnapshotDoc);
  });
}

export async function fetchLatestFinanceInvoiceAging(
  userId: string,
  teamId?: string
): Promise<FinanceInvoiceAgingSummaryDoc | null> {
  const q = query(
    collection(db, "financeInvoiceAgingSummaries"),
    where(scopeField(teamId), "==", teamId || userId),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data() as Record<string, unknown>;
  const raw = { id: d.id, ...data };
  const parsed = invoiceAgingSchema.safeParse(raw);
  return parsed.success
    ? (parsed.data as FinanceInvoiceAgingSummaryDoc)
    : (raw as FinanceInvoiceAgingSummaryDoc);
}
