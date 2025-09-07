/**
 * Lint / style remediation applied:
 * - Consolidated React imports and typed the AuthContext access with a safer cast.
 * - Replaced IIFE with a named async function for clarity.
 * - Renamed `cancelled` to `isCancelled` and used nullish coalescing for safer defaults.
 * - Converted inner helpers to arrow functions with explicit return types.
 * - Guarded divisions to avoid NaN / divide-by-zero and ensured winRate is 0 when no deals.
 * - Narrowed effect dependency to user?.uid to satisfy exhaustive-deps rules.
 */

"use client";
import { useEffect, useState, useContext } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AuthContext } from "@/context/AuthContext";

interface DealMetric {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: number[];
  intent?: "neutral" | "success" | "warning" | "danger" | "accent";
}

interface DealDoc {
  id: string;
  period?: string;
  value?: number;
  stage?: string;
  createdAt?: { toDate?: () => Date } | Date;
  closedAt?: { toDate?: () => Date } | Date;
}

interface UseSalesDealsMetricsResult {
  loading: boolean;
  error?: string;
  kpis: DealMetric[];
  dealsSample: DealDoc[];
}

export function useSalesDealsMetrics(): UseSalesDealsMetricsResult {
  const authContext = useContext(AuthContext) as unknown as
    | { user?: { uid?: string } }
    | undefined;
  const user = authContext?.user;
  const [state, setState] = useState<UseSalesDealsMetricsResult>({
    loading: true,
    kpis: [],
    dealsSample: [],
  });

  useEffect(() => {
    if (!user?.uid) {
      // When there's no authenticated user, ensure loading is false and return early.
      setState({ loading: false, kpis: [], dealsSample: [] });
      return;
    }

    let isCancelled = false;

    const fetchDeals = async (): Promise<void> => {
      try {
        const dealsQ = query(
          collection(db, "salesDeals"),
          where("userId", "==", user.uid),
          orderBy("period", "desc"),
          limit(120)
        );

        const snap = await getDocs(dealsQ);
        if (isCancelled) return;

        const deals = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        })) as DealDoc[];
        if (!deals.length) {
          setState({ loading: false, kpis: [], dealsSample: [] });
          return;
        }

        const byPeriod: Record<string, DealDoc[]> = {};
        for (const d of deals) {
          const p = d.period ?? "unknown";
          (byPeriod[p] ||= []).push(d);
        }

        const periods = Object.keys(byPeriod).sort();
        const last = periods[periods.length - 1];
        const prev = periods[periods.length - 2];

        const sum = (arr: DealDoc[], f: (x: DealDoc) => number): number =>
          arr.reduce((s, x) => s + f(x), 0);

        const lastDeals = byPeriod[last] ?? [];
        const prevDeals = prev ? byPeriod[prev] : [];
        const pipelineValue = sum(lastDeals, (d) => d.value ?? 0);
        const prevPipeline = sum(prevDeals, (d) => d.value ?? 0);
        const prevPipelineSafe = prevPipeline || 1;

        const closedWon = lastDeals.filter((d) => d.stage === "closed_won");
        const winRate = lastDeals.length
          ? (closedWon.length / lastDeals.length) * 100
          : 0;

        const stageAges = lastDeals
          .map((d) => {
            const closed =
              d.closedAt instanceof Date
                ? d.closedAt
                : (d.closedAt?.toDate?.() ?? new Date());
            const created =
              d.createdAt instanceof Date
                ? d.createdAt
                : (d.createdAt?.toDate?.() ?? new Date());
            return closed.getTime() - created.getTime();
          })
          .filter((v) => !Number.isNaN(v));

        const avgCycleDays = stageAges.length
          ? stageAges.reduce((a, b) => a + b, 0) / stageAges.length / 86400000
          : 0;

        const kpis: DealMetric[] = [
          {
            key: "pipeline",
            label: "Pipeline Value",
            value: pipelineValue,
            delta:
              ((pipelineValue - prevPipelineSafe) / prevPipelineSafe) * 100,
            trend: periods.map((p) =>
              sum(byPeriod[p] ?? [], (d) => d.value ?? 0)
            ),
            intent: "success",
          },
          {
            key: "win_rate",
            label: "Win Rate %",
            value: Number(winRate.toFixed(1)),
            delta: 0,
            trend: periods.map((p) => {
              const arr = byPeriod[p] ?? [];
              return (
                (arr.filter((d) => d.stage === "closed_won").length /
                  (arr.length || 1)) *
                100
              );
            }),
            intent: winRate > 30 ? "success" : "warning",
          },
          {
            key: "cycle",
            label: "Avg Cycle (d)",
            value: Number(avgCycleDays.toFixed(1)),
            delta: 0,
            trend: periods.map((p) => {
              const arr = byPeriod[p] ?? [];
              const ages = arr.map((d) => {
                const c =
                  d.closedAt instanceof Date
                    ? d.closedAt
                    : (d.closedAt?.toDate?.() ?? new Date());
                const s =
                  d.createdAt instanceof Date
                    ? d.createdAt
                    : (d.createdAt?.toDate?.() ?? new Date());
                return c.getTime() - s.getTime();
              });
              return ages.length
                ? ages.reduce((a, b) => a + b, 0) / ages.length / 86400000
                : 0;
            }),
            intent: avgCycleDays < 15 ? "success" : "warning",
          },
        ];

        setState({ loading: false, kpis, dealsSample: lastDeals.slice(0, 10) });
      } catch (e: unknown) {
        if (isCancelled) return;
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "failed";
        setState((s) => ({ ...s, loading: false, error: msg }));
      }
    };

    void fetchDeals();

    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  return state;
}
