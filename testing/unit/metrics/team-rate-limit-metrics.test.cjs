require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
const assert = require('assert').strict;
const metrics = require('../../../src/lib/metrics/unified-metrics.ts');

// Focus: verify recordRateLimitRejection + recordTeamRateLimitAllowed increment counters (DEV-GOV-COUNTERS)

describe('team rate limit metrics counters', () => {
    beforeEach(() => {
        if (metrics.__resetUnifiedMetricsTestOnly) metrics.__resetUnifiedMetricsTestOnly();
    });

    it('increments rejection and allow counters independently', () => {
        metrics.recordRateLimitRejection('team:alpha');
        metrics.recordRateLimitRejection('team:alpha');
        metrics.recordTeamRateLimitAllowed('team:alpha');
        metrics.recordTeamRateLimitAllowed('team:alpha');
        metrics.recordTeamRateLimitAllowed('team:beta');
        const snap = metrics.getUnifiedMetricsSnapshot();
        if (!snap) throw new Error('snapshot missing');
        if (!snap.rateLimitRejections) throw new Error('rateLimitRejections missing');
        if (!snap.teamRateLimitAllows) throw new Error('teamRateLimitAllows missing');
        assert.equal(snap.rateLimitRejections['team:alpha'], 2);
        assert.equal(snap.teamRateLimitAllows['team:alpha'], 2);
        assert.equal(snap.teamRateLimitAllows['team:beta'], 1);
        // Ensure no unintended overlap
        assert.ok(!('team:beta' in snap.rateLimitRejections));
    });
});
