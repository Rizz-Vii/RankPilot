const assert = require('assert');

// Test that enabling validation runners results in real command execution
// and that failures cause appropriate outcomes

// Don't force skip binaries for this test
delete process.env.PB_BRAIN_FORCE_SKIP_BIN;

const mod = require('../../dist/brain/scripts/brain/validation/validators');

(async () => {
  const { runValidators } = mod;
  
  console.log('Testing real validation execution...');
  
  // Test 1: When tools are disabled, should return 'skipped'
  const disabledResult = await runValidators({ 
    cfg: { tools: { typecheck: false, eslint: false, unitTests: false, playwright: false } },
    domain: 'frontend'
  });
  assert(disabledResult.lint === 'skipped', 'Disabled lint should be skipped');
  assert(disabledResult.typecheck === 'skipped', 'Disabled typecheck should be skipped');
  assert(disabledResult.tests === 'skipped', 'Disabled tests should be skipped');
  
  // Test 2: When typecheck is enabled, should run actual command
  console.log('Testing typecheck execution...');
  const typecheckResult = await runValidators({ 
    cfg: { tools: { typecheck: true, eslint: false, unitTests: false, playwright: false } },
    domain: 'frontend'
  });
  assert(['pass', 'fail', 'error'].includes(typecheckResult.typecheck), 
    `Typecheck should return pass/fail/error, got: ${typecheckResult.typecheck}`);
  assert(typecheckResult.lint === 'skipped', 'Lint should remain skipped when disabled');
  
  // Test 3: When ESLint is enabled, should run actual linting
  console.log('Testing ESLint execution...');
  const eslintResult = await runValidators({ 
    cfg: { tools: { typecheck: false, eslint: true, unitTests: false, playwright: false } },
    domain: 'frontend'
  });
  assert(['pass', 'fail', 'error'].includes(eslintResult.lint), 
    `ESLint should return pass/fail/error, got: ${eslintResult.lint}`);
  assert(eslintResult.typecheck === 'skipped', 'Typecheck should remain skipped when disabled');
  
  // Test 4: Multiple validators enabled
  console.log('Testing multiple validators...');
  const multiResult = await runValidators({ 
    cfg: { tools: { typecheck: true, eslint: true, unitTests: false, playwright: false } },
    domain: 'frontend'
  });
  assert(['pass', 'fail', 'error'].includes(multiResult.typecheck), 
    `Multi: Typecheck should return pass/fail/error, got: ${multiResult.typecheck}`);
  assert(['pass', 'fail', 'error'].includes(multiResult.lint), 
    `Multi: ESLint should return pass/fail/error, got: ${multiResult.lint}`);
  assert(multiResult.tests === 'skipped', 'Tests should remain skipped when disabled');
  
  console.log('validators.real-execution: OK');
})().catch(e => {
  console.error('validators.real-execution: FAILED', e.message || String(e));
  process.exit(1);
});