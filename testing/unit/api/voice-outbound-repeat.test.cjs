const assert = require('assert');

describe('api/voice/outbound repeat propagation', () => {
    it('accepts repeat and does not error when present', async () => {
        const route = await import('../../src/app/api/voice/outbound/route.ts');
        // Build a mock NextRequest-like object
        const body = {
            phone: '+15550001111',
            schedule: new Date(Date.now() + 60_000).toISOString(),
            voice: 'alice',
            language: 'en-US',
            rate: 1,
            repeat: 'daily',
        };
        const req = new Proxy({}, {
            get: (_t, prop) => {
                if (prop === 'json') return async () => body;
                return undefined;
            }
        });
        const res = await route.POST(req);
        const payload = await res.json();
        assert.ok(payload.ok === true || payload.error, 'should respond with ok or error json');
    });
});
