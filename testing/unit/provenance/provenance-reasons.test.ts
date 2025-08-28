import { strict as assert } from 'assert';
import { isProvenanceReasonCode, PROVENANCE_REASON_CODES } from '../../../src/lib/middleware/provenance-reasons';

(async function run() {
    for (const c of PROVENANCE_REASON_CODES) {
        assert.equal(isProvenanceReasonCode(c), true);
    }
    assert.equal(isProvenanceReasonCode('not-a-real-code'), false);
    console.log('provenance-reasons.test PASS');
})();
