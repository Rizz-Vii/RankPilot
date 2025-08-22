import { strict as assert } from 'assert';
import { __resetQueueMetrics, getQueueMetricsSnapshot, recordQueueDone, recordQueueEnqueue, recordQueueStart } from '../../src/lib/metrics/queue-metrics';

describe('Queue Metrics (DEV-QUEUE-01)', () => {
    beforeEach(() => { __resetQueueMetrics(); });

    it('tracks lifecycle and success ratio', () => {
        recordQueueEnqueue(); // task A
        recordQueueEnqueue(); // task B
        recordQueueStart();   // start A
        recordQueueDone(true);// complete A success
        recordQueueStart();   // start B
        recordQueueDone(false);// fail B
        const snap = getQueueMetricsSnapshot();
        assert.equal(snap.enqueued, 2);
        assert.equal(snap.started, 2);
        assert.equal(snap.completed, 1);
        assert.equal(snap.failed, 1);
        assert.equal(snap.running, 0);
        assert.equal(snap.depth, 0);
        assert.equal(snap.successRatio, 0.5);
    });

    it('reports successRatio 1 when no terminal tasks yet', () => {
        recordQueueEnqueue();
        recordQueueStart();
        const snap = getQueueMetricsSnapshot();
        assert.equal(snap.successRatio, 1);
    });
});
