const assert = require('assert');

// Test that UnitTestRunner is properly registered and toggleable

const tr = require('../../dist/brain/scripts/brain/execution/toolRegistry');

(async () => {
  console.log('Testing UnitTestRunner registration...');
  
  // Test 1: UnitTestRunner should be in registry
  const registry = tr.getRegistry();
  const unitTestRunner = registry.find(r => r.name === 'UnitTestRunner');
  assert(unitTestRunner, 'UnitTestRunner should be registered');
  
  // Test 2: UnitTestRunner should support appropriate domains
  assert(unitTestRunner.supports('frontend'), 'UnitTestRunner should support frontend');
  assert(unitTestRunner.supports('backend'), 'UnitTestRunner should support backend');
  assert(unitTestRunner.supports('docs'), 'UnitTestRunner should support docs');
  assert(!unitTestRunner.supports('ops'), 'UnitTestRunner should not support ops by default');
  
  // Test 3: UnitTestRunner should be toggleable via config
  const cfgEnabled = { tools: { unitTests: true } };
  const cfgDisabled = { tools: { unitTests: false } };
  
  const enabledRunners = tr.getRunnersFor('frontend', cfgEnabled).map(r => r.name);
  const disabledRunners = tr.getRunnersFor('frontend', cfgDisabled).map(r => r.name);
  
  assert(enabledRunners.includes('UnitTestRunner'), 'UnitTestRunner should be included when enabled');
  assert(!disabledRunners.includes('UnitTestRunner'), 'UnitTestRunner should be excluded when disabled');
  
  // Test 4: Other validation runners should also be properly toggleable
  const allValidationCfg = { tools: { typecheck: true, eslint: true, unitTests: true, playwright: true } };
  const allValidationRunners = tr.getRunnersFor('frontend', allValidationCfg).map(r => r.name);
  
  assert(allValidationRunners.includes('TypecheckRunner'), 'TypecheckRunner should be included when enabled');
  assert(allValidationRunners.includes('ESLintRunner'), 'ESLintRunner should be included when enabled');
  assert(allValidationRunners.includes('UnitTestRunner'), 'UnitTestRunner should be included when enabled');
  assert(allValidationRunners.includes('PlaywrightRunner'), 'PlaywrightRunner should be included when enabled');
  
  // Test 5: Verify toggle mapping is correct
  const partialCfg = { tools: { typecheck: true, eslint: false, unitTests: true, playwright: false } };
  const partialRunners = tr.getRunnersFor('frontend', partialCfg).map(r => r.name);
  
  assert(partialRunners.includes('TypecheckRunner'), 'TypecheckRunner should be included when enabled');
  assert(!partialRunners.includes('ESLintRunner'), 'ESLintRunner should be excluded when disabled');
  assert(partialRunners.includes('UnitTestRunner'), 'UnitTestRunner should be included when enabled');
  assert(!partialRunners.includes('PlaywrightRunner'), 'PlaywrightRunner should be excluded when disabled');
  
  console.log('toolRegistry.unit-test-runner: OK');
})().catch(e => {
  console.error('toolRegistry.unit-test-runner: FAILED', e.message || String(e));
  process.exit(1);
});