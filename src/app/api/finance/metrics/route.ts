import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getLogger } from '@/lib/logging/app-logger';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';
import type { FinanceInvoiceFirestore, FinanceInvoiceRuntime} from '@/types/firestore-docs';
import { mapFinanceInvoiceDoc } from '@/types/firestore-docs';

type FinanceInvoiceDoc = FinanceInvoiceRuntime;

function aggregateInvoices(invoices: FinanceInvoiceDoc[], months: number) {
    if (!invoices.length) return { kpis: [], mrrSeries: [], aging: [], invoices: [] };
    const periods = Array.from(new Set(invoices.map(i => i.period))).sort();
    const recent = periods.slice(-months);
    const filtered = invoices.filter(i => recent.includes(i.period));
    const byPeriod: Record<string, FinanceInvoiceDoc[]> = {};
    for (const inv of filtered) { (byPeriod[inv.period] ||= []).push(inv); }
    const ordered = Object.keys(byPeriod).sort();
    const sum = (arr: FinanceInvoiceDoc[], f: (x: FinanceInvoiceDoc) => number) => arr.reduce((a, x) => a + f(x), 0);
    const last = ordered.at(-1)!; const prev = ordered.at(-2);
    const lastPaid = byPeriod[last].filter(i => i.status === 'paid');
    const mrr = sum(lastPaid, i => i.amount || 0);
    const prevMrr = prev ? sum((byPeriod[prev] || []).filter(i => i.status === 'paid'), i => i.amount || 0) : mrr;
    const kpis = [
        { key: 'mrr', label: 'MRR', value: mrr, delta: prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0, trend: ordered.map(p => sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0)), intent: 'success' as const, target: mrr * 1.05 },
        { key: 'on_time', label: 'On-Time %', value: (() => { const ot = lastPaid.filter(i => { const paid = i.paidAt; const due = i.dueAt; return paid && due && paid.getTime() <= due.getTime(); }); return Number((lastPaid.length ? (ot.length / lastPaid.length * 100) : 0).toFixed(1)); })(), delta: 0, trend: ordered.map(p => { const arr = (byPeriod[p] || []).filter(i => i.status === 'paid'); const ot = arr.filter(i => { const paid = i.paidAt; const due = i.dueAt; return paid && due && paid.getTime() <= due.getTime(); }); return arr.length ? ot.length / arr.length * 100 : 0; }), intent: 'neutral' as const, target: 95 },
        { key: 'outstanding', label: 'Outstanding Invoices', value: byPeriod[last].filter(i => i.status !== 'paid').length, delta: 0, trend: ordered.map(p => (byPeriod[p] || []).filter(i => i.status !== 'paid').length), intent: 'warning' as const, target: 0, invertTarget: true }
    ];
    const now = Date.now();
    function bucket(inv: FinanceInvoiceDoc) { const due = inv.dueAt; if (!due) return '>60'; const diff = (now - due.getTime()) / (1000 * 3600 * 24); if (diff <= 15) return '0-15'; if (diff <= 30) return '16-30'; if (diff <= 60) return '31-60'; return '>60'; }
    const unpaid = filtered.filter(i => i.status !== 'paid');
    const agingMap = new Map<string, { count: number; amount: number }>();
    unpaid.forEach(u => { const b = bucket(u); if (!agingMap.has(b)) agingMap.set(b, { count: 0, amount: 0 }); const rec = agingMap.get(b)!; rec.count++; rec.amount += u.amount || 0; });
    const aging = Array.from(agingMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, v]) => ({ bucket, ...v }));
    const mrrSeries = ordered.map(p => ({ period: p, mrr: sum((byPeriod[p] || []).filter(i => i.status === 'paid'), i => i.amount || 0) }));
    return { kpis: kpis as unknown, mrrSeries, aging, invoices: filtered.slice(0, 250) };
}

export const GET = withProvenance(async function GET(req: NextRequest) {
    const logger = getLogger('api.finance.metrics');
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        let uid: string | undefined;
        let decoded: any;
        if (!authHeader) {
            // Non-production test bypass: ?testUser=email@example.com
            if (process.env.NODE_ENV !== 'production') {
                const urlObj = new URL(req.url);
                const testUserEmail = urlObj.searchParams.get('testUser');
                if (testUserEmail) {
                    try {
                        const userRecord = await adminAuth.getUserByEmail(testUserEmail).catch(() => null);
                        if (userRecord) {
                            uid = userRecord.uid;
                            decoded = { uid };
                        }
                    } catch { /* ignore */ }
                }
            }
            if (!uid) {
                const authBody = enforceProvenance({ error: 'auth_required' }, { path: 'finance/metrics', note: 'auth' });
                const res = NextResponse.json(authBody, { status: 401 });
                res.headers.set('x-finance-diagnostics', 'auth=missing');
                return res;
            }
        } else {
            const idToken = authHeader.replace('Bearer ', '');
            decoded = await adminAuth.verifyIdToken(idToken);
            uid = (decoded as any).uid;
        }
        const monthsParam = Number(new URL(req.url).searchParams.get('months') || 6);
        const months = Math.max(1, Math.min(24, isNaN(monthsParam) ? 6 : monthsParam));
        const teamId = new URL(req.url).searchParams.get('teamId') || undefined;

        const condField = teamId ? 'teamId' : 'userId';
        let invoices: FinanceInvoiceDoc[] = [];
        try {
            const q = await adminDb.collection('financeInvoices')
                .where(condField, '==', teamId || uid)
                .orderBy('period', 'desc')
                .limit(months * 30)
                .get();
            invoices = q.docs.map(d => mapFinanceInvoiceDoc(d.id, d.data() as FinanceInvoiceFirestore));
        } catch (err: unknown) {
            // Fallback path when composite index (condField + period) is missing in local/emulated envs.
            const e: any = err as any;
            if (e?.code === 9 || /FAILED_PRECONDITION/i.test(e?.message || '')) {
                const q2 = await adminDb.collection('financeInvoices')
                    .where(condField, '==', teamId || uid)
                    .limit(months * 30)
                    .get();
                invoices = q2.docs.map(d => mapFinanceInvoiceDoc(d.id, d.data() as FinanceInvoiceFirestore)).sort((a, b) => (a.period || '').localeCompare(b.period || ''));
            } else { throw err; }
        }
        const payload: any = aggregateInvoices(invoices, months) as any;
        payload.invoicesCount = (payload?.invoices?.length || invoices.length);
        const diag = `auth=${authHeader ? 'ok' : 'bypass'}; items=${payload?.invoices?.length}; months=${months}; scope=${teamId ? 'team' : 'user'}`;
        const okBody = enforceProvenance({ ...(payload as any), __provenance: 'live' }, { path: 'finance/metrics', note: 'ok' });
        const res = NextResponse.json(okBody);
        res.headers.set('x-finance-diagnostics', diag);
        return res;
    } catch (e: unknown) {
        logger.error('finance.metrics.error', { error: (e as any)?.message });
        const errBody = enforceProvenance({ error: 'internal_error' }, { path: 'finance/metrics', note: 'exception' });
        const res = NextResponse.json(errBody, { status: 500 });
        res.headers.set('x-finance-diagnostics', 'auth=unknown; error=exception');
        return res;
    }
}, { path: 'finance/metrics' });
