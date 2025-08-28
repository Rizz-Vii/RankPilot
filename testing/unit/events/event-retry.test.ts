import { strict as assert } from 'assert';
import { emit } from '../../../src/lib/events/event-bus';
import { registerWithRetry } from '../../../src/lib/events/event-retry';
import { EVENT_TYPES } from '../../../src/lib/events/event-types';

(async function run() {
    // choose a known event type
    const ev = EVENT_TYPES[0];
    let attempts = 0;
    const unsubscribe = registerWithRetry(ev, async () => {
        attempts += 1;
        if (attempts < 2) throw new Error('fail-first');
    }, { maxAttempts: 3, backoffMs: 10 });

    emit(ev, { source: 'test' });
    // wait for retries
    await new Promise(res => setTimeout(res, 80));
    unsubscribe();
    assert.ok(attempts >= 2);
    console.log('event-retry.test PASS');
})();
