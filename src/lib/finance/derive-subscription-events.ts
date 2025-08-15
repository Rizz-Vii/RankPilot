import { SubscriptionEvent } from './revenue-metrics';

/**
 * Derive approximate subscription events from invoice history.
 * In-memory heuristic only; do not persist derived ratios.
 */
export function deriveSubscriptionEvents(invoices: any[]): SubscriptionEvent[] {
    if (!invoices || !invoices.length) return [];
    const paid = invoices.filter(i => i.status === 'paid');
    const globalPeriods = Array.from(new Set(invoices.map(i => i.period))).sort();
    const currentPeriod = globalPeriods[globalPeriods.length - 1];
    const userPeriods: Record<string, Set<string>> = {};
    paid.forEach(inv => { (userPeriods[inv.userId] ||= new Set()).add(inv.period); });
    return Object.entries(userPeriods).map(([uid, periods]) => {
        const ordered = Array.from(periods).sort();
        const first = ordered[0];
        const startedAt = new Date(`${first}-01T00:00:00Z`);
        const isActive = periods.has(currentPeriod);
        const amountMonthly = paid.filter(i => i.userId === uid && i.period === currentPeriod)
            .reduce((s, i) => s + (i.amount || 0), 0);
        return {
            userId: uid,
            amountMonthly,
            status: (isActive ? 'active' : 'canceled') as any,
            startedAt,
            canceledAt: !isActive ? new Date(`${currentPeriod}-15T00:00:00Z`) : undefined,
        } as SubscriptionEvent;
    });
}
