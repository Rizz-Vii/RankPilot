// Minimal test to verify BI event subscribers increment counters when events fire
import { emit } from '../../src/lib/events/event-bus';
import { __biCountsTestOnly, ensureBiEventSubscribers } from '../../src/lib/events/subscribers/bi-subscribers';

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

(function run() {
    ensureBiEventSubscribers();
    const before = __biCountsTestOnly();
    const bSnap = before['bi.snapshot.requested'] || 0;
    const bExp = before['bi.export.requested'] || 0;

    emit('bi.snapshot.requested', { ts: Date.now(), source: 'test', attrs: { route: '/api/x' } });
    emit('bi.export.requested', { ts: Date.now(), source: 'test', attrs: { kind: 'latency', format: 'csv' } });

    const after = __biCountsTestOnly();
    const aSnap = after['bi.snapshot.requested'] || 0;
    const aExp = after['bi.export.requested'] || 0;

    assert(aSnap === bSnap + 1, 'snapshot counter should increment by 1');
    assert(aExp === bExp + 1, 'export counter should increment by 1');
    console.log('bi-subscribers tests: PASS');
})();
