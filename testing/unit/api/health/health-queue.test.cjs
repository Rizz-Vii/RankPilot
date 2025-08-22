// Queue flatten presence test (<40 LOC)
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
const assert = require('assert').strict;

describe('health route queue flatten (DEV-QUEUE-01)', () => {
    it('includes queue metrics object with expected keys', async () => {
        const mod = require('../../../../src/app/api/health/route.ts');
        assert.ok(mod && typeof mod.GET === 'function', 'Health GET not exported');
        const res = await mod.GET();
        const json = await res.json();
        assert.ok(json.queue, 'queue flatten missing');
        const q = json.queue;
        ['enqueued', 'started', 'completed', 'failed', 'running', 'depth', 'successRatio'].forEach(k => assert.ok(k in q, `missing key ${k}`));
    });
});
