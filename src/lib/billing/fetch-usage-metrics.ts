import { getLogger } from "@/lib/logging/app-logger";
import type { Firestore } from "firebase/firestore";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

export interface NormalizedUsageMetrics {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  keywordsTracked: number;
  // -1 in limits indicates "unlimited"
  keywordsLimit: number;
  competitorAnalysis: number;
  // -1 in limits indicates "unlimited"
  competitorLimit: number;
  reportsGenerated: number;
}

function monthBounds(period: string): { start: Date; end: Date } {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  return { start, end };
}

export async function fetchUsageMetrics(
  firestore: Firestore,
  userId: string
): Promise<NormalizedUsageMetrics | null> {
  const logger = getLogger("billing-usage");
  try {
    const q = query(
      collection(firestore, "usage"),
      where("userId", "==", userId),
      orderBy("period", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const raw = snap.docs[0].data() as Record<string, unknown>;
    const period = typeof raw.period === "string" ? raw.period : "1970-01";
    const { start, end } = monthBounds(period);

    const toNumber = (v: unknown): number => {
      if (v == null) return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const usage = raw.usage as Record<string, unknown> | undefined;
    const limits = raw.limits as Record<string, unknown> | undefined;

    return {
      period,
      periodStart: start,
      periodEnd: end,
      keywordsTracked: toNumber(usage?.keywordSearches),
      // -1 in limits indicates "unlimited"
      keywordsLimit: toNumber(limits?.keywordSearches),
      competitorAnalysis: toNumber(usage?.competitorReports),
      competitorLimit: toNumber(limits?.competitorReports),
      reportsGenerated: toNumber(usage?.neuroSeoAnalyses),
    };
  } catch (e: unknown) {
    let msg: string;
    if (e && typeof e === "object" && "message" in e) {
      const maybeErr = e as { message?: unknown };
      msg =
        typeof maybeErr.message === "string"
          ? maybeErr.message
          : String(maybeErr.message);
    } else {
      msg = String(e);
    }
    logger.error("billing-usage.error", { userId, error: msg });
    return null;
  }
}
