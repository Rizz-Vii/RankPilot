/* Minimal fallback triage tests */
const assert = require('assert');
const { computeFallbackTriageAction } = require('../../../scripts/brain/triage-util.js');

function check(name, input, expectAction) {
    const res = computeFallbackTriageAction(input);
    console.log('[triage-test]', name, res);
    assert.strictEqual(res.action, expectAction, `${name} expected ${expectAction} got ${res.action}`);
    assert.ok(res.rationale && res.rationale.length > 2, 'rationale missing');
}

check('none', { tsErrors: 0, lintErrors: 0 }, 'none');
check('combo high', { tsErrors: 12, lintErrors: 70 }, 'start_and_enqueue');
check('both moderate', { tsErrors: 2, lintErrors: 5 }, 'start_delegation');
check('ts only', { tsErrors: 3, lintErrors: 0 }, 'enqueue_ts_fixes');
check('lint only', { tsErrors: 0, lintErrors: 4 }, 'start_delegation');
console.log('triage.fallback.test.js PASS');
