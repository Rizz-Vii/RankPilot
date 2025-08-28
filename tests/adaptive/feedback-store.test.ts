import { strict as assert } from 'assert';
import { __resetFeedbackTestOnly, getOutcomeStats, getRecentFeedback, recordFeedback } from '../../src/lib/dev/adaptive/feedback-store';

(async function run() {
    __resetFeedbackTestOnly();
    const now = Date.now();
    recordFeedback({ id: 't1', outcome: 'accepted', at: now - 1000 });
    recordFeedback({ id: 't2', outcome: 'rejected', at: now - 2000 });
    recordFeedback({ id: 't3', outcome: 'accepted', at: now - 3000 });
    const stats = getOutcomeStats(10_000);
    assert.equal(stats.total, 3);
    assert.ok(stats.rateAccepted > 0.0);
    const recent = getRecentFeedback(2);
    assert.equal(recent.length, 2);
    console.log('feedback-store.test PASS');
})();
