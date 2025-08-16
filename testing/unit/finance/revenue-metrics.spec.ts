import { strict as assert } from 'assert';
import { computeRevenueMetrics, SubscriptionEvent } from '@/lib/finance/revenue-metrics';

describe('computeRevenueMetrics', () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    describe('empty datasets', () => {
        it('handles empty subscription array', () => {
            const snap = computeRevenueMetrics([], now);
            assert.equal(snap.mrr, 0);
            assert.equal(snap.arr, 0);
            assert.equal(snap.churnRatePct, 0);
            assert.equal(snap.ltv, null);
            assert.equal(snap.arpu, 0);
            assert.equal(snap.activeCustomers, 0);
        });

        it('handles array with only inactive/canceled subscriptions', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'canceled', startedAt: prevMonthStart, canceledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5) },
                { userId: 'u2', amountMonthly: 100, status: 'canceled', startedAt: prevMonthStart, canceledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10) }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 0);
            assert.equal(snap.arr, 0);
            assert.equal(snap.activeCustomers, 0);
            assert.equal(snap.arpu, 0);
            assert.ok(snap.churnRatePct > 0); // Should show churn occurred
        });
    });

    describe('single customer scenarios', () => {
        it('handles single active customer', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 50);
            assert.equal(snap.arr, 600);
            assert.equal(snap.activeCustomers, 1);
            assert.equal(snap.churnRatePct, 0);
            assert.equal(snap.ltv, null); // No churn means LTV is null
            assert.equal(snap.arpu, 50);
        });

        it('handles single customer who churned this period', () => {
            const canceledMidMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15));
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'canceled', startedAt: prevMonthStart, canceledAt: canceledMidMonth }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 0);
            assert.equal(snap.arr, 0);
            assert.equal(snap.activeCustomers, 0);
            assert.equal(snap.churnRatePct, 100); // 100% churn
            assert.equal(snap.arpu, 0);
            assert.ok(snap.ltv === null || snap.ltv === 0); // LTV calculation with 100% churn
        });

        it('handles single customer with zero monthly amount', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 0, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 0);
            assert.equal(snap.arr, 0);
            assert.equal(snap.activeCustomers, 1);
            assert.equal(snap.churnRatePct, 0);
            assert.equal(snap.arpu, 0);
            assert.equal(snap.ltv, null);
        });
    });

    describe('churn spike scenarios', () => {
        it('handles mass churn event (multiple customers churn in same period)', () => {
            const canceledRecently = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
            const subs: SubscriptionEvent[] = [
                // 5 customers started last month
                { userId: 'u1', amountMonthly: 50, status: 'active', startedAt: prevMonthStart },
                { userId: 'u2', amountMonthly: 60, status: 'canceled', startedAt: prevMonthStart, canceledAt: canceledRecently },
                { userId: 'u3', amountMonthly: 70, status: 'canceled', startedAt: prevMonthStart, canceledAt: canceledRecently },
                { userId: 'u4', amountMonthly: 80, status: 'canceled', startedAt: prevMonthStart, canceledAt: canceledRecently },
                { userId: 'u5', amountMonthly: 90, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 140); // Only u1 (50) + u5 (90) active
            assert.equal(snap.arr, 1680);
            assert.equal(snap.activeCustomers, 2);
            assert.equal(snap.churnRatePct, 60); // 3 out of 5 churned = 60%
            assert.equal(snap.arpu, 70); // 140 / 2 = 70
            assert.ok(snap.ltv !== null && snap.ltv > 0);
        });

        it('handles immediate churn (customer cancels same day they started)', () => {
            const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'active', startedAt: prevMonthStart },
                { userId: 'u2', amountMonthly: 100, status: 'canceled', startedAt: today, canceledAt: today }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 50); // Only u1 active
            assert.equal(snap.activeCustomers, 1);
            // u2 didn't exist at period start, so shouldn't affect churn rate for this period
            assert.equal(snap.churnRatePct, 0);
        });
    });

    describe('revenue edge cases', () => {
        it('handles very small amounts (fractional cents)', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 0.01, status: 'active', startedAt: prevMonthStart },
                { userId: 'u2', amountMonthly: 0.99, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 1.00);
            assert.equal(snap.arr, 12.00);
            assert.equal(snap.activeCustomers, 2);
            assert.equal(snap.arpu, 0.50);
        });

        it('handles very large amounts', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'enterprise1', amountMonthly: 50000, status: 'active', startedAt: prevMonthStart },
                { userId: 'enterprise2', amountMonthly: 75000.50, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 125000.50);
            assert.equal(snap.arr, 1500006.00);
            assert.equal(snap.activeCustomers, 2);
            assert.equal(snap.arpu, 62500.25);
        });

        it('handles mixed positive and zero amounts', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                { userId: 'u2', amountMonthly: 0, status: 'active', startedAt: prevMonthStart }, // Free tier
                { userId: 'u3', amountMonthly: 50, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 150);
            assert.equal(snap.arr, 1800);
            assert.equal(snap.activeCustomers, 3);
            assert.equal(snap.arpu, 50); // 150 / 3 = 50
        });

        it('handles subscriptions with null/undefined canceledAt', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'active', startedAt: prevMonthStart, canceledAt: null },
                { userId: 'u2', amountMonthly: 75, status: 'active', startedAt: prevMonthStart, canceledAt: undefined }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 125);
            assert.equal(snap.arr, 1500);
            assert.equal(snap.activeCustomers, 2);
            assert.equal(snap.churnRatePct, 0);
        });
    });

    describe('time boundary edge cases', () => {
        it('handles subscription that starts exactly at period boundary', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'active', startedAt: periodStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 50);
            assert.equal(snap.activeCustomers, 1);
        });

        it('handles subscription that cancels exactly at period boundary', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'canceled', startedAt: prevMonthStart, canceledAt: periodStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 0); // Canceled exactly at period start
            assert.equal(snap.activeCustomers, 0);
            assert.equal(snap.churnRatePct, 100); // Was active at previous period start, churned this period
        });
    });

    describe('original mixed scenario test', () => {
        it('computes MRR, ARR, churn, LTV with mixed subscriptions', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 50, status: 'active', startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 70) },
                { userId: 'u2', amountMonthly: 50, status: 'canceled', startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 95), canceledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3) },
                { userId: 'u3', amountMonthly: 100, status: 'active', startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10) }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.mrr, 150);
            assert.equal(snap.arr, 1800);
            assert.equal(snap.activeCustomers, 2); // u2 churned
            assert.ok(snap.churnRatePct >= 0 && snap.churnRatePct <= 100);
            if (snap.ltv != null) assert.ok(snap.ltv > 0);
        });
    });

    describe('formula validation tests', () => {
        it('validates ARR is always MRR * 12', () => {
            const testCases = [
                [],
                [{ userId: 'u1', amountMonthly: 25.33, status: 'active', startedAt: prevMonthStart }],
                [
                    { userId: 'u1', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                    { userId: 'u2', amountMonthly: 200.50, status: 'active', startedAt: prevMonthStart }
                ]
            ] as SubscriptionEvent[][];

            testCases.forEach((subs, index) => {
                const snap = computeRevenueMetrics(subs, now);
                assert.equal(snap.arr, snap.mrr * 12, `Test case ${index}: ARR should be MRR * 12`);
            });
        });

        it('validates ARPU calculation', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                { userId: 'u2', amountMonthly: 200, status: 'active', startedAt: prevMonthStart },
                { userId: 'u3', amountMonthly: 300, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            const expectedArpu = snap.mrr / snap.activeCustomers;
            assert.equal(snap.arpu, Math.round(expectedArpu * 100) / 100); // Rounded to 2 decimal places
        });

        it('validates LTV is null when churn rate is zero', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 100, status: 'active', startedAt: prevMonthStart }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.equal(snap.churnRatePct, 0);
            assert.equal(snap.ltv, null);
        });

        it('validates LTV calculation when churn rate is positive', () => {
            const canceledMidMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
            const subs: SubscriptionEvent[] = [
                { userId: 'u1', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                { userId: 'u2', amountMonthly: 100, status: 'canceled', startedAt: prevMonthStart, canceledAt: canceledMidMonth }
            ];
            const snap = computeRevenueMetrics(subs, now);
            assert.ok(snap.churnRatePct > 0);
            assert.ok(snap.ltv !== null && snap.ltv > 0);
            // LTV should be ARPU / (churnRate/100)
            const expectedLtv = snap.arpu / (snap.churnRatePct / 100);
            assert.ok(Math.abs(snap.ltv - expectedLtv) < 0.01, 'LTV should equal ARPU / churnRate');
        });
    });
});
