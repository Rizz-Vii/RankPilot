"use client";
import { AuthContext } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';

interface Metric { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; }
interface Result { loading: boolean; error?: string; kpis: Metric[]; rows: Array<Record<string, unknown>>; }
interface DateLike { toDate?: () => Date }
interface InvoiceDoc { id: string; period: string; status?: string; amount?: number; paidAt?: DateLike | Date | null; dueAt?: DateLike | Date | null }

export function useFinanceInvoiceMetrics(monthWindow = 6): Result {
    const { user } = useContext(AuthContext) as { user?: { uid: string } };
    const [state, setState] = useState<Result>({ loading: true, kpis: [], rows: [] });
    useEffect(() => {
        if (!user) return; let cancelled = false; void (async () => {
            try {
                const q = query(collection(db, 'financeInvoices'), where('userId', '==', user.uid), orderBy('period', 'desc'), limit(monthWindow * 24));
                const snap = await getDocs(q);
                if (cancelled) return;
                const docs: InvoiceDoc[] = snap.docs.map(d => {
                    const raw = d.data() as Record<string, unknown>;
                    const paidAtRaw = raw.paidAt;
                    const dueAtRaw = raw.dueAt;
                    return {
                        id: d.id,
                        period: String(raw.period || ''),
                        status: typeof raw.status === 'string' ? raw.status : undefined,
                        amount: typeof raw.amount === 'number' ? raw.amount : Number(raw.amount ?? 0),
                        paidAt: (paidAtRaw && typeof paidAtRaw === 'object') || paidAtRaw instanceof Date ? (paidAtRaw as DateLike | Date) : null,
                        dueAt: (dueAtRaw && typeof dueAtRaw === 'object') || dueAtRaw instanceof Date ? (dueAtRaw as DateLike | Date) : null,
                    };
                });
                if (!docs.length) { setState({ loading: false, kpis: [], rows: [] }); return; }
                const periods = Array.from(new Set(docs.map(d => d.period))).sort();
                const cutoff = periods.slice(-monthWindow);
                const filtered = docs.filter(d => cutoff.includes(d.period));
                const byPeriod: Record<string, InvoiceDoc[]> = {};
                for (const d of filtered) { (byPeriod[d.period] ||= []).push(d); }
                const ordered = Object.keys(byPeriod).sort();
                const sum = (arr: InvoiceDoc[], f: (x: InvoiceDoc) => number): number => arr.reduce((s, x) => s + f(x), 0);
                const last = ordered.at(-1);
                const prev = ordered.at(-2);
                if (!last) { setState({ loading: false, kpis: [], rows: [] }); return; }
                const lastPaid: InvoiceDoc[] = byPeriod[last].filter(i => i.status === 'paid');
                const mrr = sum(lastPaid, i => i.amount || 0);
                const prevMrr = prev ? sum((byPeriod[prev] || []).filter(i => i.status === 'paid'), i => i.amount || 0) : mrr;
                const toDate = (v: unknown): Date | undefined => {
                    if (v instanceof Date) return v;
                    if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate?: unknown }).toDate === 'function') {
                        try { return (v as { toDate: () => Date }).toDate(); } catch { return undefined; }
                    }
                    return undefined;
                };
                const onTimePaid = lastPaid.filter(i => { const paidAt = toDate(i.paidAt); const due = toDate(i.dueAt); return paidAt && due && paidAt.getTime() <= due.getTime(); });
                const onTimePct = lastPaid.length ? onTimePaid.length / lastPaid.length * 100 : 0;
                const outstanding = byPeriod[last].filter(i => i.status !== 'paid').length;
                const kpis: Metric[] = [
                    { key: 'mrr', label: 'MRR', value: mrr, delta: prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0, trend: ordered.map(p => sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0)), intent: 'neutral' },
                    { key: 'on_time', label: 'On-Time %', value: Number(onTimePct.toFixed(1)), delta: 0, trend: ordered.map(p => { const arr = (byPeriod[p] || []).filter(i => i.status === 'paid'); const ot = arr.filter(i => { const paidAt = toDate(i.paidAt); const due = toDate(i.dueAt); return paidAt && due && paidAt.getTime() <= due.getTime(); }); return arr.length ? ot.length / arr.length * 100 : 0; }), intent: onTimePct > 90 ? 'success' : 'warning' },
                    { key: 'outstanding', label: 'Outstanding', value: outstanding, delta: 0, trend: ordered.map(p => (byPeriod[p] || []).filter(i => i.status !== 'paid').length), intent: outstanding === 0 ? 'success' : 'warning' }
                ];
                const rows: Array<Record<string, unknown>> = filtered.slice(0, 200).map(f => ({ ...f }));
                setState({ loading: false, kpis, rows });
            } catch (e: unknown) { if (cancelled) return; const err = e as { message?: string }; setState({ loading: false, kpis: [], rows: [], error: err.message }); }
        })(); return () => { cancelled = true; };
    }, [user, monthWindow]);
    return state;
}
