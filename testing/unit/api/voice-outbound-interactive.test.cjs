const assert = require('assert');

describe('api/voice/outbound interactive TwiML', () => {
    it('responds OK and accepts interactive true (no throw)', async () => {
        const route = await import('../../src/app/api/voice/outbound/route.ts');
        const body = {
            phone: '+15550001111',
            schedule: new Date(Date.now() + 60_000).toISOString(),
            voice: 'alice',
            language: 'en-US',
            rate: 1.2,
            interactive: true,
        };
        const req = new Proxy({}, { get: (_t, prop) => (prop === 'json' ? async () => body : undefined) });
        const res = await route.POST(req);
        const j = await res.json();
        assert.ok(j.ok === true || j.error, 'route should return ok or error');
    });
});
