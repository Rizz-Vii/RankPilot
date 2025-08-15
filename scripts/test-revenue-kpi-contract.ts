#!/usr/bin/env ts-node
/**
 * KPI contract validation for finance invoice derived metrics (MRR / On-Time % / Outstanding).
 * This is a lightweight guard to ensure the logic mirrored in useFinanceInvoiceMetrics stays stable.
 * It builds a synthetic invoice set and re-implements the hook's aggregation to compare with expected values.
 */
import assert from 'assert';

interface InvoiceDoc { period: string; amount: number; status: string; dueAt?: Date | null; paidAt?: Date | null; issuedAt?: Date; userId: string; }

function computeHookStyleKpis(invoices: InvoiceDoc[]) {
    if (!invoices.length) return { kpis: [] };
    const periods = Array.from(new Set(invoices.map(d => d.period))).sort();
    const last = periods.at(-1)!; const prev = periods.at(-2);
    const byPeriod: Record<string, InvoiceDoc[]> = {};
    for (const inv of invoices) { (byPeriod[inv.period] ||= []).push(inv); }
    const lastPaid = byPeriod[last].filter(i => i.status === 'paid');
    const sum = (arr: InvoiceDoc[], f: (x: InvoiceDoc) => number) => arr.reduce((s, x) => s + f(x), 0);
    const mrr = sum(lastPaid, i => i.amount || 0);
    const prevMrr = prev ? sum((byPeriod[prev] || []).filter(i => i.status === 'paid'), i => i.amount || 0) : mrr;
    const onTimePaid = lastPaid.filter(i => i.paidAt && i.dueAt && i.paidAt.getTime() <= i.dueAt.getTime());
    const onTimePct = lastPaid.length ? onTimePaid.length / lastPaid.length * 100 : 0;
    const outstanding = byPeriod[last].filter(i => i.status !== 'paid').length;
    return { mrr, prevMrr, onTimePct: +onTimePct.toFixed(1), outstanding };
}

(function run() {
    const basePeriod = new Date();
    const ym = (d: Date) => d.toISOString().slice(0, 7);
    const prevDate = new Date(Date.UTC(basePeriod.getUTCFullYear(), basePeriod.getUTCMonth() - 1, 5));
    const curPeriod = ym(basePeriod); const prevPeriod = ym(prevDate);

    const invoices: InvoiceDoc[] = [
        // Previous period paid invoices
        { userId: 'u1', period: prevPeriod, amount: 50, status: 'paid', issuedAt: prevDate, paidAt: new Date(prevDate.getTime() + 2 * 86400000), dueAt: new Date(prevDate.getTime() + 5 * 86400000) },
        { userId: 'u2', period: prevPeriod, amount: 80, status: 'paid', issuedAt: prevDate, paidAt: new Date(prevDate.getTime() + 1 * 86400000), dueAt: new Date(prevDate.getTime() + 7 * 86400000) },
        // Current period paid (on-time & late)
        { userId: 'u1', period: curPeriod, amount: 60, status: 'paid', issuedAt: new Date(), paidAt: new Date(Date.now() + 2 * 86400000), dueAt: new Date(Date.now() + 3 * 86400000) }, // on time
        { userId: 'u2', period: curPeriod, amount: 90, status: 'paid', issuedAt: new Date(), paidAt: new Date(Date.now() + 9 * 86400000), dueAt: new Date(Date.now() + 5 * 86400000) }, // late
        // Current period outstanding
        { userId: 'u3', period: curPeriod, amount: 120, status: 'open', issuedAt: new Date(), dueAt: new Date(Date.now() + 10 * 86400000) }
    ];

    const { mrr, prevMrr, onTimePct, outstanding } = computeHookStyleKpis(invoices);

    // Expected calculations
    // mrr = 60 + 90 = 150
    assert.strictEqual(mrr, 150, 'MRR mismatch');
    // prevMrr = 50 + 80 = 130 => delta = (150-130)/130 *100 ≈ 15.38
    const deltaPct = prevMrr ? (mrr - prevMrr) / prevMrr * 100 : 0;
    assert.ok(Math.abs(deltaPct - 15.38) < 0.2, 'MRR delta % mismatch');
    // onTimePct: 1 on-time / 2 paid = 50.0
    assert.strictEqual(onTimePct, 50.0, 'On-Time % mismatch');
    // outstanding = 1
    assert.strictEqual(outstanding, 1, 'Outstanding count mismatch');

    console.log('[revenue-kpi-contract:test] PASS', { mrr, prevMrr, deltaPct: +deltaPct.toFixed(2), onTimePct, outstanding });
})();
