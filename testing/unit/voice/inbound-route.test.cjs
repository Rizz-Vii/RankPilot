const fetch = require('node-fetch');
const assert = require('assert');

describe('voice inbound route (unit)', function () {
    it('returns ok on accepted ack', async function () {
        const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
        const res = await fetch(`${base}/api/voice/inbound`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ event: 'unit-probe' })
        });
        const j = await res.json();
        assert.strictEqual(res.status, 200);
        assert.ok(j && j.ok, `expected ok property in response, got ${JSON.stringify(j)}`);
    });
});
