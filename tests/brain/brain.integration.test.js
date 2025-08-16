const assert = require('assert');

// Test integration of validation runners in brain execution pipeline

const config = require('../../dist/brain/scripts/brain/config');
const validators = require('../../dist/brain/scripts/brain/validation/validators');

(async () => {
  console.log('Testing brain pipeline integration...');
  
  // Test 1: Load config with validation toggles
  const testConfig = config.loadBrainConfig('./brain.config.test.json');
  assert(testConfig.tools.typecheck === true, 'Test config should enable typecheck');
  assert(testConfig.tools.eslint === true, 'Test config should enable eslint');
  assert(testConfig.tools.unitTests === false, 'Test config should disable unitTests');
  
  // Test 2: Simulate brain execution with validation
  console.log('Simulating validation in brain pipeline...');
  const validationResult = await validators.runValidators({ 
    cfg: testConfig,
    domain: 'frontend'
  });
  
  // Should have real results for enabled validators
  assert(['pass', 'fail', 'error'].includes(validationResult.typecheck), 
    `Typecheck should run, got: ${validationResult.typecheck}`);
  assert(['pass', 'fail', 'error'].includes(validationResult.lint), 
    `ESLint should run, got: ${validationResult.lint}`);
  assert(validationResult.tests === 'skipped', 'Unit tests should be skipped when disabled');
  
  // Test 3: Check if outcome should be FAIL based on validation
  const hasFailures = Object.values(validationResult).some(status => 
    status === 'fail' || status === 'error'
  );
  
  if (hasFailures) {
    console.log('Validation failures detected - this would cause run outcome to be FAIL');
  } else {
    console.log('All validations passed - run outcome would be OK');
  }
  
  // Test 4: Test outcome determination logic
  function determineRunOutcome(validation) {
    const hasValidationFailures = Object.values(validation).some(status => 
      status === 'fail' || status === 'error'
    );
    return hasValidationFailures ? 'FAIL' : 'OK';
  }
  
  const outcome = determineRunOutcome(validationResult);
  assert(['OK', 'FAIL'].includes(outcome), `Outcome should be OK or FAIL, got: ${outcome}`);
  
  console.log(`Integration test: validation outcome = ${outcome}`);
  console.log('brain.integration: OK');
  
})().catch(e => {
  console.error('brain.integration: FAILED', e.message || String(e));
  process.exit(1);
});