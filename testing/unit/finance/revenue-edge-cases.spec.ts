import { strict as assert } from 'assert';
import { computeRevenueMetrics, SubscriptionEvent } from '@/lib/finance/revenue-metrics';

/**
 * Comprehensive edge case tests for revenue metrics calculations
 * Covers empty datasets, single customer scenarios, churn spikes, and revenue edge cases
 */
describe('Revenue Metrics Edge Cases', () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    describe('Empty Dataset Scenarios', () => {
        it('should handle completely empty subscription array', () => {
            const snap = computeRevenueMetrics([], now);
            
            assert.equal(snap.mrr, 0, 'MRR should be 0 for empty dataset');
            assert.equal(snap.arr, 0, 'ARR should be 0 for empty dataset');
            assert.equal(snap.churnRatePct, 0, 'Churn rate should be 0 for empty dataset');
            assert.equal(snap.ltv, null, 'LTV should be null for empty dataset');
            assert.equal(snap.arpu, 0, 'ARPU should be 0 for empty dataset');
            assert.equal(snap.activeCustomers, 0, 'Active customers should be 0 for empty dataset');
        });

        it('should handle array with only canceled subscriptions', () => {
            const subs: SubscriptionEvent[] = [
                { 
                    userId: 'canceled1', 
                    amountMonthly: 50, 
                    status: 'canceled', 
                    startedAt: prevMonthStart, 
                    canceledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5) 
                },
                { 
                    userId: 'canceled2', 
                    amountMonthly: 100, 
                    status: 'canceled', 
                    startedAt: prevMonthStart, 
                    canceledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10) 
                }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 0, 'MRR should be 0 when all subscriptions are canceled');
            assert.equal(snap.arr, 0, 'ARR should be 0 when all subscriptions are canceled');
            assert.equal(snap.activeCustomers, 0, 'Active customers should be 0 when all are canceled');
            assert.equal(snap.arpu, 0, 'ARPU should be 0 when no active customers');
            assert.ok(snap.churnRatePct > 0, 'Churn rate should be positive when customers churned');
        });
    });

    describe('Single Customer Scenarios', () => {
        it('should handle single active customer correctly', () => {
            const subs: SubscriptionEvent[] = [
                { 
                    userId: 'single_active', 
                    amountMonthly: 75, 
                    status: 'active', 
                    startedAt: prevMonthStart 
                }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 75, 'MRR should equal the single customer amount');
            assert.equal(snap.arr, 900, 'ARR should be MRR * 12');
            assert.equal(snap.activeCustomers, 1, 'Should have 1 active customer');
            assert.equal(snap.churnRatePct, 0, 'Churn rate should be 0 with no churned customers');
            assert.equal(snap.ltv, null, 'LTV should be null when churn rate is 0');
            assert.equal(snap.arpu, 75, 'ARPU should equal MRR when only one customer');
        });

        it('should handle single customer who churned this period', () => {
            const canceledMidMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15));
            const subs: SubscriptionEvent[] = [
                { 
                    userId: 'churned_single', 
                    amountMonthly: 100, 
                    status: 'canceled', 
                    startedAt: prevMonthStart, 
                    canceledAt: canceledMidMonth 
                }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 0, 'MRR should be 0 for churned customer');
            assert.equal(snap.arr, 0, 'ARR should be 0 for churned customer');
            assert.equal(snap.activeCustomers, 0, 'Should have 0 active customers');
            assert.equal(snap.churnRatePct, 100, 'Churn rate should be 100% for single churned customer');
            assert.equal(snap.arpu, 0, 'ARPU should be 0 with no active customers');
        });

        it('should handle single customer with zero monthly amount', () => {
            const subs: SubscriptionEvent[] = [
                { 
                    userId: 'free_tier', 
                    amountMonthly: 0, 
                    status: 'active', 
                    startedAt: prevMonthStart 
                }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 0, 'MRR should be 0 for free tier customer');
            assert.equal(snap.arr, 0, 'ARR should be 0 for free tier customer');
            assert.equal(snap.activeCustomers, 1, 'Should count free tier as active customer');
            assert.equal(snap.churnRatePct, 0, 'Churn rate should be 0');
            assert.equal(snap.arpu, 0, 'ARPU should be 0 for free tier');
            assert.equal(snap.ltv, null, 'LTV should be null for zero revenue');
        });
    });

    describe('Churn Spike Scenarios', () => {
        it('should handle mass churn event correctly', () => {
            const massChurnDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
            const subs: SubscriptionEvent[] = [
                // Survivors
                { userId: 'survivor1', amountMonthly: 50, status: 'active', startedAt: prevMonthStart },
                { userId: 'survivor2', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                // Mass churn victims
                { userId: 'churned1', amountMonthly: 75, status: 'canceled', startedAt: prevMonthStart, canceledAt: massChurnDate },
                { userId: 'churned2', amountMonthly: 80, status: 'canceled', startedAt: prevMonthStart, canceledAt: massChurnDate },
                { userId: 'churned3', amountMonthly: 90, status: 'canceled', startedAt: prevMonthStart, canceledAt: massChurnDate },
                { userId: 'churned4', amountMonthly: 60, status: 'canceled', startedAt: prevMonthStart, canceledAt: massChurnDate }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 150, 'MRR should only include survivors (50 + 100)');
            assert.equal(snap.arr, 1800, 'ARR should be MRR * 12');
            assert.equal(snap.activeCustomers, 2, 'Should have 2 active customers');
            assert.equal(snap.churnRatePct, 66.67, 'Churn rate should be 4/6 = 66.67%');
            assert.equal(snap.arpu, 75, 'ARPU should be 150/2 = 75');
            assert.ok(snap.ltv !== null && snap.ltv > 0, 'LTV should be positive with churn');
        });

        it('should handle immediate churn (same-day cancel)', () => {
            const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const subs: SubscriptionEvent[] = [
                { userId: 'existing', amountMonthly: 50, status: 'active', startedAt: prevMonthStart },
                { userId: 'immediate_churn', amountMonthly: 100, status: 'canceled', startedAt: today, canceledAt: today }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 50, 'MRR should only include existing customer');
            assert.equal(snap.activeCustomers, 1, 'Should have 1 active customer');
            // Immediate churn customer wasn't active at period start, so no impact on period churn rate
            assert.equal(snap.churnRatePct, 0, 'Churn rate should be 0 for same-day churn');
        });
    });

    describe('Revenue Edge Cases', () => {
        it('should handle very small fractional amounts', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'micro1', amountMonthly: 0.01, status: 'active', startedAt: prevMonthStart },
                { userId: 'micro2', amountMonthly: 0.99, status: 'active', startedAt: prevMonthStart },
                { userId: 'micro3', amountMonthly: 0.33, status: 'active', startedAt: prevMonthStart }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 1.33, 'MRR should handle fractional cents correctly');
            assert.equal(snap.arr, 15.96, 'ARR should be calculated correctly for small amounts');
            assert.equal(snap.activeCustomers, 3, 'Should count all customers');
            assert.ok(Math.abs(snap.arpu - 0.44) < 0.01, 'ARPU should be calculated correctly');
        });

        it('should handle very large enterprise amounts', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'enterprise1', amountMonthly: 50000, status: 'active', startedAt: prevMonthStart },
                { userId: 'enterprise2', amountMonthly: 75000.50, status: 'active', startedAt: prevMonthStart }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 125000.50, 'MRR should handle large amounts correctly');
            assert.equal(snap.arr, 1500006.00, 'ARR should be calculated correctly for large amounts');
            assert.equal(snap.activeCustomers, 2, 'Should count enterprise customers');
            assert.equal(snap.arpu, 62500.25, 'ARPU should be calculated correctly for large amounts');
        });

        it('should handle mixed amounts including zero', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'paid1', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                { userId: 'free', amountMonthly: 0, status: 'active', startedAt: prevMonthStart },
                { userId: 'paid2', amountMonthly: 200, status: 'active', startedAt: prevMonthStart }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 300, 'MRR should sum only paid amounts');
            assert.equal(snap.arr, 3600, 'ARR should be MRR * 12');
            assert.equal(snap.activeCustomers, 3, 'Should count free tier in customer count');
            assert.equal(snap.arpu, 100, 'ARPU should be 300/3 = 100');
        });

        it('should handle null and undefined canceledAt values', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'null_cancel', amountMonthly: 50, status: 'active', startedAt: prevMonthStart, canceledAt: null },
                { userId: 'undef_cancel', amountMonthly: 75, status: 'active', startedAt: prevMonthStart, canceledAt: undefined }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 125, 'MRR should include customers with null/undefined canceledAt');
            assert.equal(snap.activeCustomers, 2, 'Should count customers with null/undefined canceledAt as active');
            assert.equal(snap.churnRatePct, 0, 'Churn rate should be 0 for active customers');
        });
    });

    describe('Time Boundary Edge Cases', () => {
        it('should handle subscriptions starting exactly at period boundary', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'boundary_start', amountMonthly: 50, status: 'active', startedAt: periodStart }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 50, 'Should include subscription starting at period boundary');
            assert.equal(snap.activeCustomers, 1, 'Should count customer starting at boundary');
        });

        it('should handle subscriptions canceling exactly at period boundary', () => {
            const subs: SubscriptionEvent[] = [
                { 
                    userId: 'boundary_cancel', 
                    amountMonthly: 50, 
                    status: 'canceled', 
                    startedAt: prevMonthStart, 
                    canceledAt: periodStart 
                }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.mrr, 0, 'Should not include subscription canceled at period boundary');
            assert.equal(snap.activeCustomers, 0, 'Should not count customer canceled at boundary');
            assert.equal(snap.churnRatePct, 100, 'Should show 100% churn for boundary cancellation');
        });
    });

    describe('Formula Validation', () => {
        it('should ensure ARR is always MRR * 12 for any input', () => {
            const testCases: SubscriptionEvent[][] = [
                [],
                [{ userId: 'test1', amountMonthly: 25.33, status: 'active', startedAt: prevMonthStart }],
                [
                    { userId: 'test2', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                    { userId: 'test3', amountMonthly: 200.50, status: 'active', startedAt: prevMonthStart }
                ],
                [
                    { userId: 'test4', amountMonthly: 0, status: 'active', startedAt: prevMonthStart },
                    { userId: 'test5', amountMonthly: 1000000, status: 'active', startedAt: prevMonthStart }
                ]
            ];

            testCases.forEach((subs, index) => {
                const snap = computeRevenueMetrics(subs, now);
                assert.equal(snap.arr, snap.mrr * 12, `Test case ${index}: ARR must equal MRR * 12`);
            });
        });

        it('should ensure ARPU calculation is consistent', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'arpu1', amountMonthly: 100, status: 'active', startedAt: prevMonthStart },
                { userId: 'arpu2', amountMonthly: 200, status: 'active', startedAt: prevMonthStart },
                { userId: 'arpu3', amountMonthly: 300, status: 'active', startedAt: prevMonthStart }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            const expectedArpu = snap.mrr / snap.activeCustomers;
            
            assert.ok(Math.abs(snap.arpu - expectedArpu) < 0.01, 'ARPU should equal MRR / activeCustomers');
        });

        it('should ensure LTV is null when churn rate is zero', () => {
            const subs: SubscriptionEvent[] = [
                { userId: 'no_churn', amountMonthly: 100, status: 'active', startedAt: prevMonthStart }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.equal(snap.churnRatePct, 0, 'Churn rate should be 0');
            assert.equal(snap.ltv, null, 'LTV should be null when churn rate is 0');
        });

        it('should validate LTV calculation formula when churn is positive', () => {
            const canceledMidMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
            const subs: SubscriptionEvent[] = [
                { userId: 'ltv1', amountMonthly: 120, status: 'active', startedAt: prevMonthStart },
                { userId: 'ltv2', amountMonthly: 120, status: 'canceled', startedAt: prevMonthStart, canceledAt: canceledMidMonth }
            ];
            
            const snap = computeRevenueMetrics(subs, now);
            
            assert.ok(snap.churnRatePct > 0, 'Churn rate should be positive');
            assert.ok(snap.ltv !== null && snap.ltv > 0, 'LTV should be positive when churn > 0');
            
            // Validate LTV = ARPU / (churnRate/100)
            const expectedLtv = snap.arpu / (snap.churnRatePct / 100);
            assert.ok(Math.abs(snap.ltv - expectedLtv) < 0.01, 'LTV should equal ARPU divided by monthly churn rate');
        });
    });
});