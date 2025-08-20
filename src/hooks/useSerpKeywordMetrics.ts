"use client";
import { useContext, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthContext } from '@/context/AuthContext';

interface Metric {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: number[];
  intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}
interface SerpResultItem {
  position?: number;
  title?: string;
  snippet?: string;
}
interface SerpDoc {
  id: string;
  results?: SerpResultItem[];
  createdAt?: { toDate?: () => Date } | Date;
}
interface Result {
  loading: boolean;
  error?: string;
  kpis: Metric[];
  rows: SerpDoc[];
}

export function useSerpKeywordMetrics(): Result {
  const { user } = useContext(AuthContext) as { user?: { uid: string } } | any;
  const [state, setState] = useState<Result>({ loading: true, kpis: [], rows: [] });

  useEffect(() => {
    if (!user) {
      // Ensure we don't leave the hook in a permanent loading state when no user is present
      setState({ loading: false, kpis: [], rows: [] });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const q = query(
          collection(db, 'serpData'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as SerpDoc[];

        if (!docs.length) {
          if (cancelled) return;
          setState({ loading: false, kpis: [], rows: [] });
          return;
        }

        const featuredCount = docs.filter((d) =>
          (d.results || []).some((r) => r.position === 1 && /result 1/i.test(r.title || ''))
        ).length;

        const paaCount = docs.filter((d) =>
          (d.results || []).slice(0, 5).some((r) => /snippet/i.test(r.snippet || ''))
        ).length;

        const top3Count = docs.filter((d) =>
          (d.results || []).some((r) => (r.position ?? 99) <= 3)
        ).length;

        const featuredPct = docs.length ? (featuredCount / docs.length) * 100 : 0;
        const paaPct = docs.length ? (paaCount / docs.length) * 100 : 0;
        const top3Presence = docs.length ? (top3Count / docs.length) * 100 : 0;

        const kpis: Metric[] = [
          { key: 'featured', label: 'Featured Snippet %', value: Number(featuredPct), delta: 0, trend: [Number(featuredPct)], intent: 'neutral' },
          { key: 'paa', label: 'PeopleAlsoAsk %', value: Number(paaPct), delta: 0, trend: [Number(paaPct)], intent: 'neutral' },
          {
            key: 'top3',
            label: 'Top-3 Presence %',
            value: Number(top3Presence.toFixed(1)),
            delta: 0,
            trend: [Number(top3Presence.toFixed(1))],
            intent: top3Presence > 40 ? 'success' : 'warning'
          }
        ];

        if (cancelled) return;
        setState({ loading: false, kpis, rows: docs });
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { message?: string };
        setState({ loading: false, kpis: [], rows: [], error: err.message ?? String(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
