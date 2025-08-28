const assert = require('assert').strict;
const { __resetDeadLettersTestOnly, getDeadLetters } = require('../../../src/lib/events/dead-letter');
const { emit } = require('../../../src/lib/events/event-bus');
const { registerWithRetry } = require('../../../src/lib/events/event-retry');
const { EVENT_TYPES } = require('../../../src/lib/events/event-types');
const { __resetUnifiedMetricsTestOnly, getUnifiedMetricsSnapshot } = require('../../../src/lib/metrics/unified-metrics');

// Focused tests for retry -> DLQ path and idempotency dropping duplicates.
// Uses ts-node via mocha -r ts-node/register

describe('event retry: DLQ and idempotency', () => {
    beforeEach(() => {
        __resetDeadLettersTestOnly();
        __resetUnifiedMetricsTestOnly();
    });

    it('sends to DLQ after maxAttempts exhausted and increments metrics', async () => {
        const ev = EVENT_TYPES[0];
        const unsubscribe = registerWithRetry(ev, async () => {
            throw new Error('always-fail');
        }, { maxAttempts: 2, backoffMs: 5, jitterPct: 0, strategy: 'linear' });

        emit(ev, { source: 'test' });
        await new Promise<void>(res => setTimeout(res, 30));
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
            idempotencyKey: (e: unknown) => {
                const evt = (e && typeof e === 'object') ? e as { payload?: { attrs?: { id?: unknown } } } : {};
                const id = evt.payload && evt.payload.attrs && evt.payload.attrs.id;
                return typeof id === 'string' ? id : '';
            },
        });

        const payload: { attrs: { id: string } } = { attrs: { id: 'dup-1' } };
        emit(ev, payload);
        emit(ev, payload); // duplicate should be dropped
        await new Promise<void>(res => setTimeout(res, 10));
        unsubscribe();

        assert.equal(count, 1, 'handler should run only once for duplicate idempotency key');
        const snap = getUnifiedMetricsSnapshot();
        assert.equal(snap.phase3?.eventRetriesTotal, 0);
        assert.equal(snap.phase3?.eventDeadLettersTotal, 0);
    });

    it('applies jitter within expected bounds and counts retry success', async () => {
        const ev = EVENT_TYPES[2] || EVENT_TYPES[0];

        // Capture delays by stubbing setTimeout; execute immediately to keep test fast
        const originalSetTimeout = global.setTimeout;
        const originalRandom = Math.random;
        const recordedDelays: number[] = [];
        const patchedTimeout = (fn: Parameters<typeof setTimeout>[0], delay?: number, ...rest: unknown[]) => {
            if (typeof delay === 'number') recordedDelays.push(delay);
            return (originalSetTimeout as unknown as (...args: unknown[]) => unknown)(fn, 0, ...rest);
        };
        Object.defineProperty(globalThis, 'setTimeout', { value: patchedTimeout, configurable: true });
        (Math as unknown as { random: () => number }).random = () => 1; // max jitter

        let attempts = 0;
        const unsubscribe = registerWithRetry(ev, async () => {
            attempts += 1;
            if (attempts < 3) throw new Error('fail-then-succeed');
        }, { maxAttempts: 3, backoffMs: 10, jitterPct: 0.2, strategy: 'linear' });

        emit(ev, { source: 'test' });
        await new Promise<void>(res => setTimeout(res, 30));

        // Restore globals
        Object.defineProperty(globalThis, 'setTimeout', { value: originalSetTimeout, configurable: true });
        (Math as unknown as { random: () => number }).random = originalRandom;
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
