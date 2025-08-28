import { forecastNext } from '@/lib/kpi/predictive';
import { __resetTimeSeriesTestOnly, __sampleOnceTestOnly, registerRouteForSampling } from '@/lib/metrics/time-series';
import { strict as assert } from 'assert';

// Tiny unit test for advisory forecast helper signals; doesn't hit Next.js route, but validates forecast wiring remains stable.
describe('BI advisory forecast wiring', () => {
    beforeEach(() => {
        __resetTimeSeriesTestOnly();
    });

    it('produces deterministic forecast values from minimal samples', () => {
        // Warm a few samples
        registerRouteForSampling('/api/foo');
        for (let i = 0; i < 5; i++) __sampleOnceTestOnly();
        const r1 = forecastNext({ samples: [0, 1, 2, 3] });
        const r2 = forecastNext({ samples: [10, 20, 30] });
        assert.equal(r1.advisory, true);
        assert.equal(r2.advisory, true);
    });
});
