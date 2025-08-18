"use client";
import { useContext, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthContext } from '@/context/AuthContext';

interface Metric { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; }
interface Result { loading: boolean; error?: string; kpis: Metric[]; rows: Array<Record<string, unknown>>; }
interface InvoiceDoc { id: string; period: string; status?: string; amount?: number; paidAt?: { toDate?: () => Date } | Date | null; dueAt?: { toDate?: () => Date } | Date | null }

export function useFinanceInvoiceMetrics(monthWindow = 6): Result {
    const { user } = useContext(AuthContext) as { user?: { uid: string } } | any;
    const [state, setState] = useState<Result>({ loading: true, kpis: [], rows: [] });
    useEffect(() => {
        if (!user) return; let cancelled = false; (async () => {
            try {
                const q = query(collection(db, 'financeInvoices'), where('userId', '==', user.uid), orderBy('period', 'desc'), limit(monthWindow * 24));
                const snap = await getDocs(q);
                if (cancelled) return;
                const docs: InvoiceDoc[] = snap.docs.map(d => {
                    const raw = d.data() as Record<string, unknown>;
                    return {
                        id: d.id,
                        period: String(raw.period || ''),
                        status: raw.status as string | undefined,
                        amount: typeof raw.amount === 'number' ? raw.amount : Number(raw.amount || 0) || 0,
                        paidAt: (raw.paidAt as any) ?? null,
                        dueAt: (raw.dueAt as any) ?? null,
                    };
                });
                if (!docs.length) { setState({ loading: false, kpis: [], rows: [] }); return; }
                const periods = Array.from(new Set(docs.map(d => d.period))).sort();
                const cutoff = periods.slice(-monthWindow);
                const filtered = docs.filter(d => cutoff.includes(d.period));
                const byPeriod: Record<string, InvoiceDoc[]> = {};
                for (const d of filtered) { (byPeriod[d.period] ||= []).push(d); }
                const ordered = Object.keys(byPeriod).sort();
                function sum(arr: InvoiceDoc[], f: (x: InvoiceDoc) => number) { return arr.reduce((s, x) => s + f(x), 0); }
                const last = ordered.at(-1)!; const prev = ordered.at(-2);
                const lastPaid = byPeriod[last].filter(i => i.status === 'paid');
                const mrr = sum(lastPaid, i => i.amount || 0);
                const prevMrr = prev ? sum((byPeriod[prev] || []).filter(i => i.status === 'paid'), i => i.amount || 0) : mrr;
                const toDate = (v: any): Date | undefined => v instanceof Date ? v : (v?.toDate?.() || undefined);
                const onTimePaid = lastPaid.filter(i => { const paidAt = toDate(i.paidAt); const due = toDate(i.dueAt); return paidAt && due && paidAt.getTime() <= due.getTime(); });
                const onTimePct = lastPaid.length ? onTimePaid.length / lastPaid.length * 100 : 0;
                const outstanding = byPeriod[last].filter(i => i.status !== 'paid').length;
                const kpis: Metric[] = [
                    { key: 'mrr', label: 'MRR', value: mrr, delta: prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0, trend: ordered.map(p => sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0)), intent: 'neutral' },
                    { key: 'on_time', label: 'On-Time %', value: Number(onTimePct.toFixed(1)), delta: 0, trend: ordered.map(p => { const arr = (byPeriod[p] || []).filter(i => i.status === 'paid'); const ot = arr.filter(i => { const paidAt = toDate(i.paidAt); const due = toDate(i.dueAt); return paidAt && due && paidAt.getTime() <= due.getTime(); }); return arr.length ? ot.length / arr.length * 100 : 0; }), intent: onTimePct > 90 ? 'success' : 'warning' },
                    { key: 'outstanding', label: 'Outstanding', value: outstanding, delta: 0, trend: ordered.map(p => (byPeriod[p] || []).filter(i => i.status !== 'paid').length), intent: outstanding === 0 ? 'success' : 'warning' }
                ];
                setState({ loading: false, kpis, rows: filtered.slice(0, 200) as unknown as Array<Record<string, unknown>> });
            } catch (e: unknown) { if (cancelled) return; const err = e as { message?: string }; setState({ loading: false, kpis: [], rows: [], error: err.message }); }
        })(); return () => { cancelled = true; };
    }, [user, monthWindow]);
    return state;
}
