import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getLogger } from '@/lib/logging/app-logger';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';

type FinanceInvoiceDoc = { id?: string; userId?: string; teamId?: string; period: string; amount: number; status: string; issuedAt?: any; paidAt?: any; dueAt?: any; planTier?: string; };

function aggregateInvoices(invoices: FinanceInvoiceDoc[], months: number) {
    if (!invoices.length) return { kpis: [], mrrSeries: [], aging: [], invoices: [] };
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
    const kpis = [
        { key: 'mrr', label: 'MRR', value: mrr, delta: prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0, trend: ordered.map(p => sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0)), intent: 'success' as const, target: mrr * 1.05 },
        { key: 'on_time', label: 'On-Time %', value: (() => { const ot = lastPaid.filter(i => { const paid = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paid && due && paid.getTime() <= due.getTime(); }); return Number((lastPaid.length ? (ot.length / lastPaid.length * 100) : 0).toFixed(1)); })(), delta: 0, trend: ordered.map(p => { const arr = (byPeriod[p] || []).filter(i => i.status === 'paid'); const ot = arr.filter(i => { const paid = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paid && due && paid.getTime() <= due.getTime(); }); return arr.length ? ot.length / arr.length * 100 : 0; }), intent: 'neutral' as const, target: 95 },
        { key: 'outstanding', label: 'Outstanding Invoices', value: byPeriod[last].filter(i => i.status !== 'paid').length, delta: 0, trend: ordered.map(p => (byPeriod[p] || []).filter(i => i.status !== 'paid').length), intent: 'warning' as const, target: 0, invertTarget: true }
    ];
    const now = Date.now();
    function bucket(inv: FinanceInvoiceDoc) { const due = inv.dueAt?.toDate?.(); if (!due) return '>60'; const diff = (now - due.getTime()) / (1000 * 3600 * 24); if (diff <= 15) return '0-15'; if (diff <= 30) return '16-30'; if (diff <= 60) return '31-60'; return '>60'; }
    const unpaid = filtered.filter(i => i.status !== 'paid');
    const agingMap = new Map<string, { count: number; amount: number }>();
    unpaid.forEach(u => { const b = bucket(u); if (!agingMap.has(b)) agingMap.set(b, { count: 0, amount: 0 }); const rec = agingMap.get(b)!; rec.count++; rec.amount += u.amount || 0; });
    const aging = Array.from(agingMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, v]) => ({ bucket, ...v }));
    const mrrSeries = ordered.map(p => ({ period: p, mrr: sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0) }));
    return { kpis: kpis as any, mrrSeries, aging, invoices: filtered.slice(0, 250) };
}

export const GET = withProvenance(async function GET(req: NextRequest) {
    const logger = getLogger('api.finance.metrics');
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader) {
            const res = NextResponse.json(enforceProvenance({ error: 'auth_required' }, { path: 'finance/metrics', note: 'auth' }), { status: 401 });
            res.headers.set('x-finance-diagnostics', 'auth=missing');
            return res;
        }
        const idToken = authHeader.replace('Bearer ', '');
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;
        const monthsParam = Number(new URL(req.url).searchParams.get('months') || 6);
        const months = Math.max(1, Math.min(24, isNaN(monthsParam) ? 6 : monthsParam));
        const teamId = new URL(req.url).searchParams.get('teamId') || undefined;

        const condField = teamId ? 'teamId' : 'userId';
        const q = await adminDb.collection('financeInvoices').where(condField, '==', teamId || uid).orderBy('period', 'desc').limit(months * 30).get();
        const invoices: FinanceInvoiceDoc[] = q.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const payload = aggregateInvoices(invoices, months);
        const diag = `auth=ok; items=${payload.invoices.length}; months=${months}; scope=${teamId ? 'team' : 'user'}`;
        const res = NextResponse.json(enforceProvenance({ ...payload, __provenance: 'live' }, { path: 'finance/metrics', note: 'ok' }));
        res.headers.set('x-finance-diagnostics', diag);
        return res;
    } catch (e: any) {
        logger.error('finance.metrics.error', { error: e?.message });
        const res = NextResponse.json(enforceProvenance({ error: 'internal_error' }, { path: 'finance/metrics', note: 'exception' }), { status: 500 });
        res.headers.set('x-finance-diagnostics', 'auth=unknown; error=exception');
        return res;
    }
}, { path: 'finance/metrics' });
