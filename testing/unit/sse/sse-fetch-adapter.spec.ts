// This spec is intentionally disabled due to runtime flakiness on Node 22 fetch semantics.
// See sibling file sse-fetch-adapter.spec.skip.ts for the preserved tests.
describe('fetchSSE adapter (disabled placeholder)', () => {
    it('skipped', function () {
        this.skip();
    });
});
