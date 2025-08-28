const assert = require('assert').strict;
const { __resetDeadLettersTestOnly, getDeadLetters } = require('../../../src/lib/events/dead-letter');
const { emit } = require('../../../src/lib/events/event-bus');
const { registerWithRetry } = require('../../../src/lib/events/event-retry');
const { EVENT_TYPES } = require('../../../src/lib/events/event-types');
const { __resetUnifiedMetricsTestOnly, getUnifiedMetricsSnapshot } = require('../../../src/lib/metrics/unified-metrics');

// Focused tests for retry -> DLQ path and idempotency in CJS to avoid ts-node setup.

describe('event retry: DLQ and idempotency', () => {
    beforeEach(() => {
        __resetDeadLettersTestOnly();
        __resetUnifiedMetricsTestOnly();
    });

    it('sends to DLQ after maxAttempts exhausted and increments metrics', async () => {
        const ev = EVENT_TYPES[0];
        let called = 0;
        const unsubscribe = registerWithRetry(ev, async () => {
            called += 1; throw new Error('always-fail');
        }, { maxAttempts: 2, backoffMs: 5, jitterPct: 0, strategy: 'linear' });

        emit(ev, { source: 'test' });
        await new Promise(res => setTimeout(res, 30));
        unsubscribe();

        const dlq = getDeadLetters(10);
        assert.equal(dlq.length, 1, 'one item should be in DLQ');
        assert.equal(dlq[0].type, ev);
        assert.equal(dlq[0].attempts, 2);
        assert.ok(dlq[0].error, 'error preserved');

        const snap = getUnifiedMetricsSnapshot();
        assert.equal(snap.phase3?.eventDeadLettersTotal, 1);
        assert.ok((snap.phase3?.eventRetriesTotal || 0) >= 1);
    });

    it('drops duplicate events when idempotencyKey matches', async () => {
        const ev = EVENT_TYPES[1] || EVENT_TYPES[0];
        let count = 0;
        const unsubscribe = registerWithRetry(ev, async () => { count += 1; }, {
            idempotencyKey: (e) => {
                const evt = (e && typeof e === 'object') ? e : {};
                const payload = evt.payload && typeof evt.payload === 'object' ? evt.payload : {};
                const attrs = payload.attrs && typeof payload.attrs === 'object' ? payload.attrs : {};
                const id = attrs.id;
                return typeof id === 'string' ? id : '';
            },
        });

        const payload = { attrs: { id: 'dup-1' } };
        emit(ev, payload);
        emit(ev, payload); // duplicate should be dropped
        await new Promise(res => setTimeout(res, 10));
        unsubscribe();

        assert.equal(count, 1, 'handler should run only once for duplicate idempotency key');
        const snap = getUnifiedMetricsSnapshot();
        assert.equal(snap.phase3?.eventRetriesTotal, 0);
        assert.equal(snap.phase3?.eventDeadLettersTotal, 0);
    });

    it('applies jitter within expected bounds and counts retry success', async () => {
        const ev = EVENT_TYPES[2] || EVENT_TYPES[0];

        const originalSetTimeout = global.setTimeout;
        const originalRandom = Math.random;
        const recordedDelays = [];
        global.setTimeout = (fn, delay, ...rest) => {
            if (typeof delay === 'number') recordedDelays.push(delay);
            return originalSetTimeout(fn, 0, ...rest);
        };
        Math.random = () => 1; // max jitter

        let attempts = 0;
        const unsubscribe = registerWithRetry(ev, async () => {
            attempts += 1;
            if (attempts < 3) throw new Error('fail-then-succeed');
        }, { maxAttempts: 3, backoffMs: 10, jitterPct: 0.2, strategy: 'linear' });

        emit(ev, { source: 'test' });
        // Use originalSetTimeout so our wait doesn't get captured in recordedDelays
        await new Promise(res => originalSetTimeout(res, 30));

        global.setTimeout = originalSetTimeout;
        Math.random = originalRandom;
        unsubscribe();

        // With maxAttempts=3 and failing twice, we should have 2 scheduled retries
        assert.equal(recordedDelays.length, 2);
        // Expected: attempt1 => 10ms base with +20% => ~12; attempt2 => 20ms base with +20% => ~24
        assert.ok(Math.abs(recordedDelays[0] - 12) <= 1, `delay1=${recordedDelays[0]} ~12`);
        assert.ok(Math.abs(recordedDelays[1] - 24) <= 1, `delay2=${recordedDelays[1]} ~24`);

        const snap = getUnifiedMetricsSnapshot();
        assert.equal(snap.phase3?.eventRetriesTotal, 2);
        assert.equal(snap.phase3?.eventDeadLettersTotal, 0);
        assert.equal(snap.phase3?.eventRetrySuccessTotal, 1);
    });
});
