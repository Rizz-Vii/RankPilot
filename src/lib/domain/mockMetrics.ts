// Deterministic mock metrics for dashboards (replace with real Firestore/AI aggregation later)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const seedrandom: (seed: string) => (() => number) = require('seedrandom');

export interface DomainMetricSet {
    kpis: Array<{
        key: string;
        label: string;
        value: number;
        delta: number;
        trend: number[];
        intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
    }>;
    quotas?: Array<{ key: string; label: string; used: number; limit: number }>;
}

function generateTrend(rng: () => number, points = 20, base = 50) {
    const arr: number[] = [];
    let current = base + rng() * 10 - 5;
    for (let i = 0; i < points; i++) {
        const drift = (rng() - 0.5) * 6;
        current = Math.max(0, current + drift);
        arr.push(Number(current.toFixed(2)));
    }
    return arr;
}

export function getMockMetrics(domain: 'sales' | 'finance' | 'marketing'): DomainMetricSet {
    const rng = seedrandom(domain);
    if (domain === 'sales') {
        return {
            kpis: [
                { key: 'pipeline', label: 'Pipeline Value', value: 420_000, delta: 8.2, trend: generateTrend(rng, 24, 55), intent: 'success' },
                { key: 'velocity', label: 'Stage Velocity (days)', value: 11.4, delta: -5.1, trend: generateTrend(rng, 24, 40), intent: 'success' },
                { key: 'forecast', label: 'Forecast Accuracy', value: 92, delta: 3.4, trend: generateTrend(rng, 24, 60), intent: 'success' },
            ],
            quotas: [
                { key: 'active_deals', label: 'Active Deals', used: 58, limit: 120 },
                { key: 'new_opps', label: 'New Opps (30d)', used: 34, limit: 60 },
                { key: 'sequences', label: 'Outbound Sequences', used: 12, limit: 25 },
            ],
        };
    }
    if (domain === 'finance') {
        return {
            kpis: [
                { key: 'mrr', label: 'MRR', value: 58000, delta: 4.7, trend: generateTrend(rng, 24, 70), intent: 'success' },
                { key: 'churn', label: 'Logo Churn %', value: 1.8, delta: -0.4, trend: generateTrend(rng, 24, 30), intent: 'success' },
                { key: 'ltv', label: 'Avg LTV', value: 4200, delta: 6.3, trend: generateTrend(rng, 24, 50) },
            ],
            quotas: [
                { key: 'api', label: 'API Calls', used: 8200, limit: 10000 },
                { key: 'reports', label: 'Reports', used: 18, limit: 25 },
                { key: 'exports', label: 'Exports', used: 9, limit: 25 },
            ],
        };
    }
    // marketing
    return {
        kpis: [
            { key: 'email_engagement', label: 'Email Engagement %', value: 38, delta: 5.2, trend: generateTrend(rng, 24, 45), intent: 'success' },
            { key: 'lead_funnel', label: 'Leads Qualified', value: 260, delta: 7.9, trend: generateTrend(rng, 24, 50) },
            { key: 'social_velocity', label: 'Social Velocity', value: 1420, delta: 12.4, trend: generateTrend(rng, 24, 55), intent: 'success' },
        ],
        quotas: [
            { key: 'emails', label: 'Emails Sent', used: 12000, limit: 20000 },
            { key: 'campaigns', label: 'Active Campaigns', used: 7, limit: 15 },
            { key: 'assets', label: 'Generated Assets', used: 58, limit: 150 },
        ],
    };
}
