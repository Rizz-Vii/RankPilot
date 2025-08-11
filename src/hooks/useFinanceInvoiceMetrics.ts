"use client";
import { useContext, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthContext } from '@/context/AuthContext';

interface Metric { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; }
interface Result { loading: boolean; error?: string; kpis: Metric[]; rows: any[]; }

export function useFinanceInvoiceMetrics(monthWindow = 6): Result {
    const { user } = useContext<any>(AuthContext);
    const [state, setState] = useState<Result>({ loading: true, kpis: [], rows: [] });
    useEffect(() => {
        if (!user) return; let cancelled = false; (async () => {
            try {
                const q = query(collection(db, 'financeInvoices'), where('userId', '==', user.uid), orderBy('period', 'desc'), limit(monthWindow * 24));
                const snap = await getDocs(q); if (cancelled) return; const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                if (!docs.length) { setState({ loading: false, kpis: [], rows: [] }); return; }
                const periods = Array.from(new Set(docs.map(d => d.period))).sort(); const cutoff = periods.slice(-monthWindow); const filtered = docs.filter(d => cutoff.includes(d.period));
                const byPeriod: Record<string, any[]> = {}; for (const d of filtered) { (byPeriod[d.period] ||= []).push(d); } const ordered = Object.keys(byPeriod).sort();
                function sum(arr: any[], f: (x: any) => number) { return arr.reduce((s, x) => s + f(x), 0); }
                const last = ordered.at(-1)!; const prev = ordered.at(-2);
                const lastPaid = byPeriod[last].filter(i => i.status === 'paid');
                const mrr = sum(lastPaid, i => i.amount || 0); const prevMrr = prev ? sum((byPeriod[prev] || []).filter(i => i.status === 'paid'), i => i.amount || 0) : mrr;
                const onTimePaid = lastPaid.filter(i => { const paidAt = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paidAt && due && paidAt.getTime() <= due.getTime(); });
                const onTimePct = lastPaid.length ? onTimePaid.length / lastPaid.length * 100 : 0;
                const outstanding = byPeriod[last].filter(i => i.status !== 'paid').length;
                const kpis: Metric[] = [
                    { key: 'mrr', label: 'MRR', value: mrr, delta: prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0, trend: ordered.map(p => sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0)), intent: 'neutral' },
                    { key: 'on_time', label: 'On-Time %', value: Number(onTimePct.toFixed(1)), delta: 0, trend: ordered.map(p => { const arr = (byPeriod[p] || []).filter(i => i.status === 'paid'); const ot = arr.filter(i => { const paidAt = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paidAt && due && paidAt.getTime() <= due.getTime(); }); return arr.length ? ot.length / arr.length * 100 : 0; }), intent: onTimePct > 90 ? 'success' : 'warning' },
                    { key: 'outstanding', label: 'Outstanding', value: outstanding, delta: 0, trend: ordered.map(p => (byPeriod[p] || []).filter(i => i.status !== 'paid').length), intent: outstanding === 0 ? 'success' : 'warning' }
                ];
                setState({ loading: false, kpis, rows: filtered.slice(0, 200) });
            } catch (e: any) { if (cancelled) return; setState({ loading: false, kpis: [], rows: [], error: e.message }); }
        })(); return () => { cancelled = true; };
    }, [user, monthWindow]);
    return state;
}
