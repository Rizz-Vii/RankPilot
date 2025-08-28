// Finance Metrics Service - aggregates invoice data with mock fallback
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { db } from '@/lib/firebase';
import { managedOnSnapshot } from '@/lib/firebase/write-guard';
import { allowFinanceMocks } from '@/lib/flags/finance';
import type { FinanceInvoiceFirestore, FinanceInvoiceRuntime } from '@/types/firestore-docs';
import { mapFinanceInvoiceDoc } from '@/types/firestore-docs';
import type { Unsubscribe } from 'firebase/firestore';
import { collection, getDocs, limit, orderBy, query, where, type DocumentData, type QuerySnapshot } from 'firebase/firestore';

// Legacy export kept for downstream code expecting FinanceInvoiceDoc name
export interface FinanceInvoiceDoc extends FinanceInvoiceRuntime { }

export interface AggregatedFinanceMetrics {
    kpis: { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; target?: number; invertTarget?: boolean }[];
    mrrSeries: { period: string; mrr: number }[];
    aging: { bucket: string; count: number; amount: number }[];
    invoices: FinanceInvoiceDoc[];
}

function aggregateInvoices(invoices: FinanceInvoiceRuntime[], months: number): AggregatedFinanceMetrics {
    if (!invoices.length) {
        // Return empty aggregates here; mock fallback is handled at the async layers
        // where awaiting is possible (fetch) or explicitly in subscribers.
        return { kpis: [], mrrSeries: [], aging: [], invoices: [] };
    }
    const periods = Array.from(new Set(invoices.map(i => i.period))).sort();
    const recent = periods.slice(-months);
    const filtered = invoices.filter(i => recent.includes(i.period));
    const byPeriod: Record<string, FinanceInvoiceRuntime[]> = {};
    for (const inv of filtered) { (byPeriod[inv.period] ||= []).push(inv); }
    const ordered = Object.keys(byPeriod).sort();
    const sum = (arr: FinanceInvoiceRuntime[], f: (x: FinanceInvoiceRuntime) => number) => arr.reduce((a, x) => a + f(x), 0);
    const last = ordered.at(-1)!; const prev = ordered.at(-2);
    const lastPaid = byPeriod[last].filter(i => i.status === 'paid');
    const mrr = sum(lastPaid, i => i.amount || 0);
    const prevMrr = prev ? sum((byPeriod[prev] || []).filter(i => i.status === 'paid'), i => i.amount || 0) : mrr;
    const kpis: AggregatedFinanceMetrics['kpis'] = [
        {
            key: 'mrr',
            label: 'MRR',
            value: mrr,
            delta: prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0,
            trend: ordered.map(p => sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0)),
            intent: 'success',
            target: mrr * 1.05
        },
        {
            key: 'on_time',
            label: 'On-Time %',
            value: (() => {
                const ot = lastPaid.filter(i => {
                    const paid = i.paidAt;
                    const due = i.dueAt;
                    return paid && due && paid.getTime() <= due.getTime();
                });
                return Number((lastPaid.length ? (ot.length / lastPaid.length * 100) : 0).toFixed(1));
            })(),
            delta: 0,
            trend: ordered.map(p => {
                const arr = (byPeriod[p] || []).filter(i => i.status === 'paid');
                const ot = arr.filter(i => {
                    const paid = i.paidAt;
                    const due = i.dueAt;
                    return paid && due && paid.getTime() <= due.getTime();
                });
                return arr.length ? ot.length / arr.length * 100 : 0;
            }),
            intent: 'neutral',
            target: 95
        },
        {
            key: 'outstanding',
            label: 'Outstanding Invoices',
            value: byPeriod[last].filter(i => i.status !== 'paid').length,
            delta: 0,
            trend: ordered.map(p => (byPeriod[p] || []).filter(i => i.status !== 'paid').length),
            intent: 'warning',
            target: 0,
            invertTarget: true
        }
    ];
    const now = Date.now();
    function bucket(inv: FinanceInvoiceRuntime) { const due = inv.dueAt; if (!due) return '>60'; const diff = (now - due.getTime()) / (1000 * 3600 * 24); if (diff <= 15) return '0-15'; if (diff <= 30) return '16-30'; if (diff <= 60) return '31-60'; return '>60'; }
    const unpaid = filtered.filter(i => i.status !== 'paid');
    const agingMap = new Map<string, { count: number; amount: number }>();
    unpaid.forEach(u => { const b = bucket(u); if (!agingMap.has(b)) agingMap.set(b, { count: 0, amount: 0 }); const rec = agingMap.get(b)!; rec.count++; rec.amount += u.amount || 0; });
    const aging = Array.from(agingMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, v]) => ({ bucket, ...v }));
    const mrrSeries = ordered.map(p => ({ period: p, mrr: sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0) }));
    return { kpis, mrrSeries, aging, invoices: filtered.slice(0, 250) };
}

export async function fetchFinanceMetrics(userId: string, months: number, teamId?: string): Promise<AggregatedFinanceMetrics> {
    try {
        const conds = teamId ? [where('teamId', '==', teamId)] : [where('userId', '==', userId)];
        const q = query(collection(db, 'financeInvoices'), ...conds, orderBy('period', 'desc'), limit(months * 30));
        const snap = await getDocs(q);
        const invoices: FinanceInvoiceRuntime[] = snap.docs.map(d => mapFinanceInvoiceDoc(d.id, d.data() as FinanceInvoiceFirestore));
        if (!invoices.length) throw new Error('empty');
        return aggregateInvoices(invoices, months);
    } catch {
        if (allowFinanceMocks()) {
            const mock = await getMockMetrics('finance');
            return { kpis: mock.kpis, mrrSeries: [], aging: [], invoices: [] };
        }
        return { kpis: [], mrrSeries: [], aging: [], invoices: [] };
    }
}

export function subscribeFinanceMetrics(userId: string, months: number, cb: (m: AggregatedFinanceMetrics) => void, teamId?: string): Unsubscribe {
    const conds = teamId ? [where('teamId', '==', teamId)] : [where('userId', '==', userId)];
    const qRef = query(collection(db, 'financeInvoices'), ...conds, orderBy('period', 'desc'));
    let invoices: FinanceInvoiceRuntime[] = [];
    const unsub = managedOnSnapshot(
        qRef,
        (snap: unknown) => {
            const qs = snap as QuerySnapshot<DocumentData>;
            invoices = qs.docs.map(docSnap => mapFinanceInvoiceDoc(docSnap.id, docSnap.data() as FinanceInvoiceFirestore));
            if (!invoices.length && allowFinanceMocks()) {
                void getMockMetrics('finance')
                    .then(mock => cb({ kpis: mock.kpis, mrrSeries: [], aging: [], invoices: [] }))
                    .catch(() => cb(aggregateInvoices(invoices, months)));
            } else {
                cb(aggregateInvoices(invoices, months));
            }
        },
        err => {
            if ((err as { code?: string })?.code === 'permission-denied') {
                console.warn('[FinanceMetrics] permission-denied accessing financeInvoices');
                if (allowFinanceMocks()) {
                    void getMockMetrics('finance')
                        .then(mock => cb({ kpis: mock.kpis, mrrSeries: [], aging: [], invoices: [] }))
                        .catch(() => cb({ kpis: [], mrrSeries: [], aging: [], invoices: [] }));
                } else {
                    cb({ kpis: [], mrrSeries: [], aging: [], invoices: [] });
                }
            } else {
                console.error('[FinanceMetrics] snapshot error', err);
            }
        },
        { debounceMs: 120 }
    );
    return () => { unsub(); };
}
