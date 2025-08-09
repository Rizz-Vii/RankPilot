"use client";
import { useContext, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthContext } from '@/context/AuthContext';

interface Metric { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger'; }
interface Result { loading: boolean; error?: string; kpis: Metric[]; rows: any[]; }

export function useContentBriefMetrics(monthWindow = 6): Result {
    const { user } = useContext<any>(AuthContext);
    const [state, setState] = useState<Result>({ loading: true, kpis: [], rows: [] });
    useEffect(() => {
        if (!user) return; let cancelled = false; (async () => {
            try {
                const q = query(collection(db, 'contentBriefs'), where('userId', '==', user.uid), orderBy('period', 'desc'), limit(monthWindow * 24));
                const snap = await getDocs(q); if (cancelled) return; const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                if (!docs.length) { setState({ loading: false, kpis: [], rows: [] }); return; }
                const periods = Array.from(new Set(docs.map(d => d.period))).sort(); const cutoff = periods.slice(-monthWindow); const filtered = docs.filter(d => cutoff.includes(d.period));
                const byPeriod: Record<string, any[]> = {}; for (const d of filtered) { (byPeriod[d.period] ||= []).push(d); } const ordered = Object.keys(byPeriod).sort();
                const last = ordered.at(-1)!; const prev = ordered.at(-2);
                const lastCount = byPeriod[last].length; const prevCount = prev ? byPeriod[prev].length : lastCount;
                const avgTarget = (arr: any[]) => { const vals = arr.map(b => b.brief?.seoGuidelines?.targetWordCount || 0); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; };
                const lastAvg = avgTarget(byPeriod[last]); const prevAvg = prev ? avgTarget(byPeriod[prev]) : lastAvg;
                const completionTrend = ordered.map(p => 100);
                const kpis: Metric[] = [
                    { key: 'briefs', label: 'Briefs Created', value: lastCount, delta: prevCount ? (lastCount - prevCount) / prevCount * 100 : 0, trend: ordered.map(p => byPeriod[p].length), intent: 'neutral' },
                    { key: 'avg_words', label: 'Avg Target Words', value: Number(lastAvg.toFixed(0)), delta: prevAvg ? (lastAvg - prevAvg) / prevAvg * 100 : 0, trend: ordered.map(p => Number(avgTarget(byPeriod[p]).toFixed(0))), intent: 'neutral' },
                    { key: 'completion', label: 'Completion %', value: 100, delta: 0, trend: completionTrend, intent: 'success' }
                ];
                setState({ loading: false, kpis, rows: filtered.slice(0, 200) });
            } catch (e: any) { if (cancelled) return; setState({ loading: false, kpis: [], rows: [], error: e.message }); }
        })(); return () => { cancelled = true; };
    }, [user, monthWindow]);
    return state;
}
