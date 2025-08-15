// Revenue Metrics Formulas (Phase 2 MVP)
// In-memory computation using subscription & invoice events (placeholder dataset).
// Verified by scripts/test-revenue-metrics.ts (unit contract) ensuring:
//  - MRR = Sum of monthly amounts for active (non-canceled-as-of) subs in current period
//  - ARR = MRR * 12
//  - Churn Rate (logo) = churnedThisPeriod / customersAtStart * 100 (2dp)
//  - ARPU = MRR / ActiveCustomers (2dp)
//  - LTV = ARPU / (monthlyChurnRate) with safeguard (if churn=0 -> null)
//  - active determination respects canceledAt > asOf boundary
// Inputs intentionally minimal; real implementation will draw from billing events.

export interface SubscriptionEvent { userId: string; amountMonthly: number; status: 'active' | 'canceled'; canceledAt?: Date | null; startedAt: Date; }

export interface RevenueSnapshot {
    mrr: number;
    arr: number;
    churnRatePct: number; // %
    ltv: number | null; // null when churn undefined or zero
    arpu: number;
    activeCustomers: number;
}

export function computeRevenueMetrics(subs: SubscriptionEvent[], asOf: Date = new Date()): RevenueSnapshot {
    const monthKey = asOf.getUTCFullYear() + '-' + String(asOf.getUTCMonth() + 1).padStart(2, '0');
    // Active = status active and (no cancel date or cancel date after period end)
    const active = subs.filter(s => s.status === 'active' && (!s.canceledAt || s.canceledAt.getTime() > asOf.getTime()));
    const activeCustomers = new Set(active.map(s => s.userId));
    const mrr = active.reduce((sum, s) => sum + s.amountMonthly, 0);
    const arr = mrr * 12;
    // Determine churn: customers that were active at start of month but now canceled.
    const periodStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
    const startActive = subs.filter(s => s.startedAt.getTime() <= periodStart.getTime() && (!s.canceledAt || s.canceledAt.getTime() > periodStart.getTime()));
    const startSet = new Set(startActive.map(s => s.userId));
    const churnedThisPeriod = subs.filter(s => s.canceledAt && s.canceledAt.getTime() >= periodStart.getTime() && s.canceledAt.getTime() <= asOf.getTime()).map(s => s.userId);
    const churnUnique = new Set(churnedThisPeriod.filter(id => startSet.has(id)));
    const churnRatePct = startSet.size ? +(churnUnique.size / startSet.size * 100).toFixed(2) : 0;
    const arpu = activeCustomers.size ? +(mrr / activeCustomers.size).toFixed(2) : 0;
    const churnRateMonthly = churnRatePct / 100;
    const ltv = churnRateMonthly > 0 ? +(arpu / churnRateMonthly).toFixed(2) : null;
    return { mrr: +mrr.toFixed(2), arr: +arr.toFixed(2), churnRatePct, ltv, arpu, activeCustomers: activeCustomers.size };
}
