import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { FinanceInvoiceFirestore, FinanceInvoiceRuntime } from '@/types/firestore-docs';
import { mapFinanceInvoiceDoc } from '@/types/firestore-docs';

export type FinanceMetrics = {
    revenue: number;
    mrr: number;
    users: number;
};

function detectMode(req?: Request): 'mock' | 'live' {
    // Query param override (?financeMock=0 switches to live)
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('financeMetricsMode')
            if (stored === 'live' || stored === 'mock') return stored
        } catch { }
    }
    if (req) {
        const url = new URL(req.url)
        if (url.searchParams.get('financeMock') === '0') return 'live'
    }
    const envMode = (process.env.FINANCE_METRICS_MODE as 'mock' | 'live' | undefined) || 'mock'
    return envMode
}

export async function getFinanceMetrics(req?: Request): Promise<{ data: FinanceMetrics; headers: Record<string, string> }> {
    const mode = detectMode(req);
    if (mode === 'mock') {
        // Lightweight deterministic mock figures for design/dev
        const mock: FinanceMetrics = { revenue: 12345, mrr: 678, users: 42 };
        return { data: mock, headers: { 'X-Finance-Metrics-Mock': '1' } };
    }

    // LIVE: Aggregate from financeInvoices for the authenticated principal (user or team)
    // Auth model: accept Bearer <idToken>; in non-production, allow ?testUser=email@example.com
    let uid: string | undefined;
    let scopeTeamId: string | undefined;
    let months = 6;
    try {
        if (req) {
            const url = new URL(req.url);
            scopeTeamId = url.searchParams.get('teamId') || undefined;
            const m = Number(url.searchParams.get('months') || '6');
            months = Math.max(1, Math.min(24, isNaN(m) ? 6 : m));
        }
    } catch { /* ignore url parse */ }

    // Verify token if provided
    let authDiagnostics = 'missing';
    try {
        const header = req?.headers?.get?.('authorization') || req?.headers?.get?.('Authorization');
        if (header) {
            const token = header.replace('Bearer ', '');
            const decoded = await adminAuth.verifyIdToken(token).catch(() => null) as { uid?: string } | null;
            if (decoded?.uid) { uid = decoded.uid; authDiagnostics = 'ok'; }
        } else if (process.env.NODE_ENV !== 'production' && req) {
            const url = new URL(req.url);
            const testUser = url.searchParams.get('testUser');
            if (testUser) {
                try {
                    const rec = await adminAuth.getUserByEmail(testUser).catch(() => null);
                    if (rec) { uid = rec.uid; authDiagnostics = 'test-bypass'; }
                } catch { /* ignore */ }
            }
        }
    } catch { /* ignore auth errors; fall back to zeros below */ }

    if (!uid && !scopeTeamId) {
        // Preserve contract and avoid hard failure: return zeros when unauthenticated
        return {
            data: { revenue: 0, mrr: 0, users: 0 },
            headers: { 'X-Finance-Metrics-Live': '1', 'x-finance-diagnostics': `auth=${authDiagnostics}; items=0; months=${months}; scope=unknown` },
        };
    }

    const condField = scopeTeamId ? 'teamId' : 'userId';
    const condValue = scopeTeamId || uid!;
    type Inv = FinanceInvoiceRuntime;
    let invoices: Inv[] = [];

    // Fetch recent invoices (limit heuristic: months * 30 docs)
    try {
        const q = await adminDb
            .collection('financeInvoices')
            .where(condField, '==', condValue)
            .orderBy('period', 'desc')
            .limit(months * 30)
            .get();
        invoices = q.docs.map(d => mapFinanceInvoiceDoc(d.id, d.data() as FinanceInvoiceFirestore));
    } catch (err: unknown) {
        // Fallback when composite index is missing (emulator/dev environments)
        const msg = (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') ? (err as { message: string }).message : '';
        if (/FAILED_PRECONDITION|9\b/.test(msg)) {
            const q2 = await adminDb
                .collection('financeInvoices')
                .where(condField, '==', condValue)
                .limit(months * 30)
                .get();
            invoices = q2.docs
                .map(d => mapFinanceInvoiceDoc(d.id, d.data() as FinanceInvoiceFirestore))
                .sort((a, b) => (a.period || '').localeCompare(b.period || ''));
        } else {
            // On unexpected error, degrade gracefully to zeros with diagnostic header
            return {
                data: { revenue: 0, mrr: 0, users: 0 },
                headers: { 'X-Finance-Metrics-Live': '1', 'x-finance-diagnostics': `auth=${authDiagnostics}; error=fetch_invoices` },
            };
        }
    }

    if (!invoices.length) {
        return {
            data: { revenue: 0, mrr: 0, users: 0 },
            headers: { 'X-Finance-Metrics-Live': '1', 'x-finance-diagnostics': `auth=${authDiagnostics}; items=0; months=${months}; scope=${scopeTeamId ? 'team' : 'user'}` },
        };
    }

    // Determine recent window and compute metrics
    const periods = Array.from(new Set(invoices.map(i => i.period))).sort();
    const recent = periods.slice(-months);
    const filtered = invoices.filter(i => recent.includes(i.period));
    const byPeriod: Record<string, Inv[]> = {};
    for (const inv of filtered) { (byPeriod[inv.period] ||= []).push(inv); }
    const ordered = Object.keys(byPeriod).sort();
    const sum = (arr: Inv[], f: (x: Inv) => number) => arr.reduce((a, x) => a + f(x), 0);
    const last = ordered.at(-1)!;
    const lastPaid = (byPeriod[last] || []).filter(i => i.status === 'paid');

    const mrr = sum(lastPaid, i => i.amount || 0);
    const revenue = sum(filtered.filter(i => i.status === 'paid'), i => i.amount || 0);
    const users = new Set(
        filtered.map(i => (('userId' in i && typeof i.userId === 'string' && i.userId) || ('teamId' in i && typeof i.teamId === 'string' && i.teamId) || undefined)).filter(Boolean)
    ).size;

    const data: FinanceMetrics = { revenue, mrr, users };
    const headers = {
        'X-Finance-Metrics-Live': '1',
        'x-finance-diagnostics': `auth=${authDiagnostics}; items=${filtered.length}; months=${months}; scope=${scopeTeamId ? 'team' : 'user'}`,
    } as Record<string, string>;
    return { data, headers };
}
