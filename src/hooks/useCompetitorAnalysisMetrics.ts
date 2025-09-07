"use client";
import { AuthContext } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useContext, useEffect, useState } from "react";

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
  rows: Array<Record<string, unknown>>;
}
interface CompOverview {
  domainAuthority?: number;
}
interface CompDoc {
  id: string;
  period: string;
  competitors?: string[];
  analysis?: { overview?: CompOverview[] };
}

export function useCompetitorAnalysisMetrics(monthWindow = 6): Result {
  // Narrow AuthContext to only the needed shape; avoid broad any
  const { user } = useContext(AuthContext) as { user?: { uid: string } };
  const [state, setState] = useState<Result>({
    loading: true,
    kpis: [],
    rows: [],
  });
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const q = query(
          collection(db, "competitorAnalyses"),
          where("userId", "==", user.uid),
          orderBy("period", "desc"),
          limit(monthWindow * 16)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const docs: CompDoc[] = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            period: String(raw.period || ""),
            competitors: Array.isArray(raw.competitors)
              ? (raw.competitors as string[])
              : [],
            analysis: raw.analysis as { overview?: CompOverview[] } | undefined,
          };
        });
        if (!docs.length) {
          setState({ loading: false, kpis: [], rows: [] });
          return;
        }
        const periods = Array.from(new Set(docs.map((d) => d.period))).sort();
        const cutoff = periods.slice(-monthWindow);
        const filtered = docs.filter((d) => cutoff.includes(d.period));
        const byPeriod: Record<string, CompDoc[]> = {};
        for (const d of filtered) {
          (byPeriod[d.period] ||= []).push(d);
        }
        const ordered = Object.keys(byPeriod).sort();
        const last = ordered.at(-1)!;
        const prev = ordered.at(-2);
        const uniqueCompetitors = (arr: CompDoc[]) =>
          Array.from(new Set(arr.flatMap((a) => a.competitors || []))).length;
        const avgDomainAuthority = (arr: CompDoc[]) => {
          const vals = arr.flatMap((a) =>
            (a.analysis?.overview || []).map((o) => o.domainAuthority || 0)
          );
          return vals.length
            ? vals.reduce((s, v) => s + v, 0) / vals.length
            : 0;
        };
        const gapOpportunities = (arr: CompDoc[]) => {
          const overviews = arr.flatMap((a) => a.analysis?.overview || []);
          const max = overviews.reduce(
            (m, o) => Math.max(m, o.domainAuthority || 0),
            0
          );
          return overviews.filter((o) => (o.domainAuthority || 0) < max - 5)
            .length;
        };
        const lastDocs = byPeriod[last];
        const prevDocs = prev ? byPeriod[prev] : lastDocs;
        const uniqLast = uniqueCompetitors(lastDocs);
        const uniqPrev = uniqueCompetitors(prevDocs) || uniqLast;
        const lastDA = avgDomainAuthority(lastDocs);
        const prevDA = avgDomainAuthority(prevDocs) || lastDA;
        const lastGaps = gapOpportunities(lastDocs);
        const prevGaps = gapOpportunities(prevDocs) || lastGaps;
        const kpis: Metric[] = [
          {
            key: "competitors",
            label: "Unique Competitors",
            value: uniqLast,
            delta: uniqPrev ? ((uniqLast - uniqPrev) / uniqPrev) * 100 : 0,
            trend: ordered.map((p) => uniqueCompetitors(byPeriod[p])),
            intent: "neutral",
          },
          {
            key: "avg_da",
            label: "Avg Domain Authority",
            value: Number(lastDA.toFixed(1)),
            delta: prevDA ? ((lastDA - prevDA) / prevDA) * 100 : 0,
            trend: ordered.map((p) =>
              Number(avgDomainAuthority(byPeriod[p]).toFixed(1))
            ),
            intent: "neutral",
          },
          {
            key: "gap_ops",
            label: "Gap Opportunities",
            value: lastGaps,
            delta: prevGaps ? ((lastGaps - prevGaps) / prevGaps) * 100 : 0,
            trend: ordered.map((p) => gapOpportunities(byPeriod[p])),
            intent: lastGaps > 0 ? "success" : "neutral",
          },
        ];
        setState({
          loading: false,
          kpis,
          rows: filtered.slice(0, 200) as unknown as Array<
            Record<string, unknown>
          >,
        });
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { message?: string };
        setState({ loading: false, kpis: [], rows: [], error: err.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, monthWindow]);
  return state;
}
