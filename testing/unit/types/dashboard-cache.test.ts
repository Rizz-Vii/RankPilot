import { strict as assert } from 'assert';
import type { DashboardData } from '@/lib/services/dashboard-data.service';

interface MockUserProfile {
    dashboardCache?: { data?: DashboardData; version?: string };
}

describe('Dashboard Cache Typing', () => {
    it('accepts valid DashboardData structure', () => {
        const cache: DashboardData = {
            seoScore: { current: 42, change: 2 },
            trackedKeywords: { current: 10, change: 1 },
            activeProjects: { current: 3, change: 1 },
            seoScoreTrend: [{ date: '2025-08-01', score: 40 }],
            keywordVisibility: { score: 55, top3: 2, top10: 5, top100: 10 },
            domainAuthority: { score: 12, history: [] },
            backlinks: { total: 100, newLast30Days: 10, history: [] },
            trafficSources: [{ name: 'Organic Search', value: 60, fill: 'var(--color-chart-1)' }]
        };
        const profile: MockUserProfile = { dashboardCache: { data: cache, version: '1.0' } };
        assert.equal(profile.dashboardCache?.data?.seoScore.current, 42);
    });

    it('rejects invalid structure via TypeScript (compile-time)', () => {
        // @ts-expect-error missing required seoScore field
        const bad: DashboardData = { trackedKeywords: { current: 0, change: 0 } };
        void bad;
    });
});
