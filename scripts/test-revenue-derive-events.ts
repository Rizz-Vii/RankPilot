import { deriveSubscriptionEvents } from '../src/lib/finance/derive-subscription-events';
import { computeRevenueMetrics } from '../src/lib/finance/revenue-metrics';

// Synthetic invoice set covering two users across three periods
const invoices = [
    { userId: 'u1', period: '2025-06', status: 'paid', amount: 100 },
    { userId: 'u1', period: '2025-07', status: 'paid', amount: 100 },
    { userId: 'u1', period: '2025-08', status: 'paid', amount: 120 },
    { userId: 'u2', period: '2025-06', status: 'paid', amount: 80 },
    { userId: 'u2', period: '2025-07', status: 'paid', amount: 80 },
    // u2 missing 2025-08 => considered canceled
];

const subs = deriveSubscriptionEvents(invoices);
if (subs.length !== 2) throw new Error('Expected 2 subscription events');
const u1 = subs.find(s => s.userId === 'u1');
const u2 = subs.find(s => s.userId === 'u2');
if (!u1 || !u2) throw new Error('Missing derived subs');
if (u1.status !== 'active') throw new Error('u1 should be active');
if (u2.status !== 'canceled') throw new Error('u2 should be canceled (no latest period invoice)');

const metrics = computeRevenueMetrics(subs, new Date('2025-08-15T00:00:00Z'));
if (metrics.mrr !== 120) throw new Error(`Unexpected MRR ${metrics.mrr}`);
if (metrics.arr !== 1440) throw new Error(`Unexpected ARR ${metrics.arr}`);
if (metrics.churnRatePct <= 0) throw new Error('Churn should be positive due to u2 cancellation');

console.log('PASS test-revenue-derive-events', { mrr: metrics.mrr, arr: metrics.arr, churn: metrics.churnRatePct, active: u1.status, canceled: u2.status });
