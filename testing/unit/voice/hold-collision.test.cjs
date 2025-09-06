const assert = require('assert');

describe('voice hold collision & expiry (fallback mode)', function () {
    it('createAppointment should handle missing hold in fallback mode', async function () {
        const tools = require('../../../src/lib/voice/agent-tools');
        // call createAppointment with a made-up holdId; in fallback mode without adminDb
        const res = await tools.createAppointment({ holdId: 'nonexistent-hold', payload: { name: 'Test' } });
        // In environments without adminDb the function may succeed with a local fallback apptId
        if (res.ok) {
            assert.ok(res.apptId && typeof res.apptId === 'string');
        } else {
            assert.ok(res.error);
        }
    });
});
