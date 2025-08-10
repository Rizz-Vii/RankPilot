// Finance Metrics Service - aggregates invoice data with mock fallback
import { collection, getDocs, onSnapshot, orderBy, query, where, Unsubscribe, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/connection-manager';
import { getMockMetrics } from '@/lib/domain/mockMetrics';

export interface FinanceInvoiceDoc { id?: string; userId?: string; teamId?: string; period: string; amount: number; status: string; issuedAt?: any; paidAt?: any; dueAt?: any; planTier?: string; }

export interface AggregatedFinanceMetrics {
    kpis: { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger'; target?: number; invertTarget?: boolean }[];
    mrrSeries: { period: string; mrr: number }[];
    aging: { bucket: string; count: number; amount: number }[];
    invoices: FinanceInvoiceDoc[];
}

function aggregateInvoices(invoices: FinanceInvoiceDoc[], months: number): AggregatedFinanceMetrics {
    if (!invoices.length) {
        const mock = getMockMetrics('finance');
        return { kpis: mock.kpis, mrrSeries: [], aging: [], invoices: [] };
    }
    const periods = Array.from(new Set(invoices.map(i => i.period))).sort();
    const recent = periods.slice(-months);
    const filtered = invoices.filter(i => recent.includes(i.period));
    const byPeriod: Record<string, FinanceInvoiceDoc[]> = {};
    for (const inv of filtered) { (byPeriod[inv.period] ||= []).push(inv); }
    const ordered = Object.keys(byPeriod).sort();
    const sum = (arr: any[], f: (x: any) => number) => arr.reduce((a, x) => a + f(x), 0);
    const last = ordered.at(-1)!; const prev = ordered.at(-2);
    const lastPaid = byPeriod[last].filter(i => i.status === 'paid');
    const mrr = sum(lastPaid, i => i.amount || 0);
    const prevMrr = prev ? sum((byPeriod[prev] || []).filter(i => i.status === 'paid'), i => i.amount || 0) : mrr;
    const kpis: AggregatedFinanceMetrics['kpis'] = [
        { key: 'mrr', label: 'MRR', value: mrr, delta: prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0, trend: ordered.map(p => sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0)), intent: 'success', target: mrr * 1.05 },
        { key: 'on_time', label: 'On-Time %', value: (() => { const ot = lastPaid.filter(i => { const paid = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paid && due && paid.getTime() <= due.getTime(); }); return Number((lastPaid.length ? (ot.length / lastPaid.length * 100) : 0).toFixed(1)); })(), delta: 0, trend: ordered.map(p => { const arr = (byPeriod[p] || []).filter(i => i.status === 'paid'); const ot = arr.filter(i => { const paid = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paid && due && paid.getTime() <= due.getTime(); }); return arr.length ? ot.length / arr.length * 100 : 0; }), intent: 'neutral', target: 95 },
        { key: 'outstanding', label: 'Outstanding Invoices', value: byPeriod[last].filter(i => i.status !== 'paid').length, delta: 0, trend: ordered.map(p => (byPeriod[p] || []).filter(i => i.status !== 'paid').length), intent: 'warning', target: 0, invertTarget: true }
    ];
    const now = Date.now();
    function bucket(inv: FinanceInvoiceDoc) { const due = inv.dueAt?.toDate?.(); if (!due) return '>60'; const diff = (now - due.getTime()) / (1000 * 3600 * 24); if (diff <= 15) return '0-15'; if (diff <= 30) return '16-30'; if (diff <= 60) return '31-60'; return '>60'; }
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
        const invoices: FinanceInvoiceDoc[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        if (!invoices.length) throw new Error('empty');
        return aggregateInvoices(invoices, months);
    } catch {
        const mock = getMockMetrics('finance');
        return { kpis: mock.kpis, mrrSeries: [], aging: [], invoices: [] };
    }
}

export function subscribeFinanceMetrics(userId: string, months: number, cb: (m: AggregatedFinanceMetrics) => void, teamId?: string): Unsubscribe {
    const conds = teamId ? [where('teamId', '==', teamId)] : [where('userId', '==', userId)];
    const q = query(collection(db, 'financeInvoices'), ...conds, orderBy('period', 'desc'));
    let invoices: FinanceInvoiceDoc[] = [];
    const unsub = onSnapshot(q, snap => { invoices = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })); cb(aggregateInvoices(invoices, months)); });
    return () => { unsub(); };
}
