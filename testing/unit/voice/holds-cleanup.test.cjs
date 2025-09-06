const assert = require('assert');

describe('voice holds cleanup', function () {
    it('returns no_admin_db when adminDb missing', async function () {
        const mod = require('../../../src/lib/voice/holds-cleanup');
        const res = await mod.cleanupExpiredHolds({ limit: 10 });
        assert.strictEqual(res.ok, false);
        assert.strictEqual(res.reason, 'no_admin_db');
    });
});
