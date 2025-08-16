const assert = require('assert');

// Test that validation failures cause appropriate run outcomes and remediation tasks

const mod = require('../../dist/brain/scripts/brain/validation/validators');

(async () => {
  const { runValidators } = mod;
  
  console.log('Testing validation failure handling...');
  
  // Test 1: Force a validation failure
  const failResult = await runValidators({ 
    forceFail: true,
    cfg: { tools: { typecheck: true, eslint: true, unitTests: true } },
    domain: 'frontend'
  });
  
  assert(failResult.lint === 'fail', 'Forced fail should make lint fail');
  assert(failResult.typecheck === 'skipped', 'Forced fail should skip typecheck');
  assert(failResult.tests === 'skipped', 'Forced fail should skip tests');
  
  // Test 2: Check that validation failures are properly detected
  // (This would be used by the brain orchestrator to set outcome to FAIL)
  function shouldGenerateFailureOutcome(validationResult) {
    return Object.values(validationResult).some(status => 
      status === 'fail' || status === 'error'
    );
  }
  
  assert(shouldGenerateFailureOutcome(failResult), 'Validation failure should trigger FAIL outcome');
  
  // Test 3: Passing validations should not trigger failure
  const passResult = { lint: 'pass', typecheck: 'pass', tests: 'pass' };
  assert(!shouldGenerateFailureOutcome(passResult), 'Passing validations should not trigger FAIL outcome');
  
  // Test 4: Mixed results should trigger failure if any fail
  const mixedResult = { lint: 'pass', typecheck: 'fail', tests: 'skipped' };
  assert(shouldGenerateFailureOutcome(mixedResult), 'Mixed results with failure should trigger FAIL outcome');
  
  // Test 5: All skipped should not trigger failure
  const skippedResult = { lint: 'skipped', typecheck: 'skipped', tests: 'skipped' };
  assert(!shouldGenerateFailureOutcome(skippedResult), 'All skipped should not trigger FAIL outcome');
  
  console.log('validators.failure-handling: OK');
})().catch(e => {
  console.error('validators.failure-handling: FAILED', e.message || String(e));
  process.exit(1);
});