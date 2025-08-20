"use client";

import { useContext, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AuthContext } from "@/context/AuthContext";

interface Metric {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: number[];
  intent?: "neutral" | "success" | "warning" | "danger" | "accent";
}
interface Result {
  loading: boolean;
  error?: string;
  kpis: Metric[];
  rows: unknown[];
}

type BriefDoc = {
  id: string;
  period: string;
  brief?: { seoGuidelines?: { targetWordCount?: number } };
} & Record<string, unknown>;

export function useContentBriefMetrics(monthWindow = 6): Result {
  const { user } = useContext(AuthContext) as { user?: { uid: string } } | any;
  const [state, setState] = useState<Result>({ loading: true, kpis: [], rows: [] });

  useEffect(() => {
    if (!user) {
      setState({ loading: false, kpis: [], rows: [] });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const q = query(
          collection(db, "contentBriefs"),
          where("userId", "==", user.uid),
          orderBy("period", "desc"),
          limit(monthWindow * 24)
        );

        const snap = await getDocs(q);
        if (cancelled) return;

        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as BriefDoc[];

        if (!docs.length) {
          setState({ loading: false, kpis: [], rows: [] });
          return;
        }

        const periods = Array.from(new Set(docs.map((d) => d.period))).sort();
        const cutoff = periods.slice(-monthWindow);
        const filtered = docs.filter((d) => cutoff.includes(d.period));

        const byPeriod: Record<string, BriefDoc[]> = {};
        for (const d of filtered) {
          const p = String(d.period);
          (byPeriod[p] ||= []).push(d);
        }

        const ordered = Object.keys(byPeriod).sort();
        const last = ordered.length ? ordered[ordered.length - 1] : undefined;
        const prev = ordered.length > 1 ? ordered[ordered.length - 2] : undefined;

        const lastCount = last ? byPeriod[last].length : 0;
        const prevCount = prev ? byPeriod[prev].length : lastCount;

        const avgTarget = (arr: BriefDoc[]) => {
          const vals = arr.map((b) => b.brief?.seoGuidelines?.targetWordCount ?? 0);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        };

        const lastAvg = last ? avgTarget(byPeriod[last]) : 0;
        const prevAvg = prev ? avgTarget(byPeriod[prev]) : lastAvg;

        const completionTrend = ordered.map(() => 100);

        const safePercentDelta = (current: number, previous: number) =>
          previous > 0 ? ((current - previous) / previous) * 100 : 0;

        const kpis: Metric[] = [
          {
            key: "briefs",
            label: "Briefs Created",
            value: lastCount,
            delta: safePercentDelta(lastCount, prevCount),
            trend: ordered.map((p) => byPeriod[p].length),
            intent: "neutral",
          },
          {
            key: "avg_words",
            label: "Avg Target Words",
            value: Math.round(lastAvg),
            delta: safePercentDelta(lastAvg, prevAvg),
            trend: ordered.map((p) => Math.round(avgTarget(byPeriod[p]))),
            intent: "neutral",
          },
          {
            key: "completion",
            label: "Completion %",
            value: 100,
            delta: 0,
            trend: completionTrend,
            intent: "success",
          },
        ];

        if (!cancelled) {
          setState({ loading: false, kpis, rows: filtered.slice(0, 200) });
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setState({ loading: false, kpis: [], rows: [], error: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, monthWindow]);

  return state;
}
