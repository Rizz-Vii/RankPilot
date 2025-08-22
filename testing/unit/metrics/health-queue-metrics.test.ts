import { strict as assert } from 'assert';
import { __resetQueueMetrics, recordQueueDone, recordQueueEnqueue, recordQueueStart } from '../../../src/lib/metrics/queue-metrics';
import { getUnifiedMetricsSnapshot } from '../../../src/lib/metrics/unified-metrics';

// This test focuses only on ensuring unified snapshot exposure + health flatten fields logic shape.
// We do not invoke the actual Next.js route handler (would require mocking firestore + admin); instead we assert
// the unified snapshot contains queue field after instrumentation lifecycle events.

describe('queue metrics integration (DEV-QUEUE-01)', () => {
    beforeEach(() => {
        __resetQueueMetrics();
    });

    it('records lifecycle and exposes queue snapshot with derived depth & successRatio', () => {
        recordQueueEnqueue(); // enqueued=1 depth=1
        recordQueueEnqueue(); // enqueued=2 depth=2
        recordQueueStart();   // started=1 running=1 depth=1
        recordQueueDone(true); // completed=1 running=0 depth=1 successRatio=1
        const snapshot = getUnifiedMetricsSnapshot();
        assert(snapshot.queue, 'queue snapshot missing');
        assert.equal(snapshot.queue?.enqueued, 2);
        assert.equal(snapshot.queue?.started, 1);
        assert.equal(snapshot.queue?.completed, 1);
        assert.equal(snapshot.queue?.failed, 0);
        assert.equal(snapshot.queue?.running, 0);
        assert.equal(snapshot.queue?.depth, 1);
        assert.equal(snapshot.queue?.successRatio, 1);
    });

    it('handles no terminal tasks (successRatio null) then failure path', () => {
        recordQueueEnqueue();
        recordQueueStart();
        let snapshot = getUnifiedMetricsSnapshot();
        assert(snapshot.queue, 'queue snapshot missing early');
        assert.equal(snapshot.queue?.successRatio, null);
        recordQueueDone(false);
        snapshot = getUnifiedMetricsSnapshot();
        assert.equal(snapshot.queue?.failed, 1);
        assert.equal(snapshot.queue?.successRatio, 0);
    });
});
