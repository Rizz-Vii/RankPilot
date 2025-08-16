#!/usr/bin/env node
/**
 * End-to-end verification of Wave 6: Validation Pipeline & Forced-Fail Mechanism
 * 
 * This test verifies all acceptance criteria:
 * 1. runValidators calls enabled validator runners and maps exit codes
 * 2. CLI flag --force-validator-fail forces at least one validator to fail
 * 3. Environment variable PB_BRAIN_FORCE_VALIDATION_FAIL=1 works
 * 4. Outcome status is set to FAIL when validation fails
 * 5. Remediation task is created with validation failures
 * 6. Follow-up tasks are included for fixing validation failures
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function latestArtifact(dir, prefix = 'run-') {
  const p = path.join(process.cwd(), dir);
  const files = fs.existsSync(p) ? fs.readdirSync(p).filter(f => f.startsWith(prefix)).sort() : [];
  for (let i = files.length - 1; i >= 0; i--) {
    const full = path.join(p, files[i]);
    try { JSON.parse(fs.readFileSync(full, 'utf8')); return full; } catch {}
  }
  return null;
}

function runValidationTest(testName, args, env = {}) {
  console.log(`\n🧪 ${testName}`);
  
  const result = spawnSync('node', ['dist/brain/scripts/brain/cli.js', '--mode', 'execute', ...args], {
    stdio: 'pipe',
    env: { ...process.env, ...env },
    timeout: 30000
  });
  
  assert(result.status === 0, `${testName}: CLI should complete successfully`);
  
  const runLog = latestArtifact('artifacts/brain', 'run-');
  assert(runLog, `${testName}: Run log should exist`);
  
  const logContent = JSON.parse(fs.readFileSync(runLog, 'utf8'));
  return logContent;
}

function main() {
  console.log('🚀 Wave 6: End-to-End Validation Pipeline Verification');
  console.log('='*60);
  
  // Build brain module
  console.log('📦 Building brain module...');
  const buildResult = spawnSync('npm', ['run', '-s', 'build:brain'], { stdio: 'pipe' });
  assert(buildResult.status === 0, 'Brain build should succeed');
  console.log('✅ Build successful');
  
  // Test 1: Acceptance Criteria - CLI flag forces validation failure
  const forcedFailLog = runValidationTest(
    'AC1: CLI Flag --force-validator-fail', 
    ['--force-validator-fail']
  );
  
  assert(forcedFailLog.outcome.status === 'FAIL', 
    'AC1: Outcome status should be FAIL when forced');
  assert(forcedFailLog.validation, 'AC1: Validation results should exist');
  
  const hasForceFailure = Object.values(forcedFailLog.validation)
    .some(status => status === 'fail');
  assert(hasForceFailure, 'AC1: At least one validator should be forced to fail');
  console.log('✅ AC1: CLI flag forces validation failure');
  
  // Test 2: Acceptance Criteria - Environment variable works
  const envFailLog = runValidationTest(
    'AC2: Environment Variable PB_BRAIN_FORCE_VALIDATION_FAIL=1',
    [],
    { PB_BRAIN_FORCE_VALIDATION_FAIL: '1' }
  );
  
  assert(envFailLog.outcome.status === 'FAIL', 
    'AC2: Environment variable should force FAIL status');
  console.log('✅ AC2: Environment variable forces validation failure');
  
  // Test 3: Acceptance Criteria - Remediation file creation
  const remediationFile = latestArtifact('artifacts/brain', 'remediation-');
  assert(remediationFile, 'AC3: Remediation file should be created');
  
  const remediationContent = JSON.parse(fs.readFileSync(remediationFile, 'utf8'));
  assert(remediationContent.reason === 'validation', 
    'AC3: Remediation reason should be validation');
  assert(remediationContent.validationFailures, 
    'AC3: Remediation should include validation failures');
  console.log('✅ AC3: Remediation task created with validation failures');
  
  // Test 4: Acceptance Criteria - Follow-up tasks
  assert(forcedFailLog.followUps && forcedFailLog.followUps.length > 0, 
    'AC4: Follow-up tasks should exist');
  
  const hasRemediationTask = forcedFailLog.followUps.some(f => f.type === 'remediation');
  const hasSpecificTasks = forcedFailLog.followUps.some(f => f.type === 'task');
  
  assert(hasRemediationTask, 'AC4: Should have remediation follow-up task');
  assert(hasSpecificTasks, 'AC4: Should have specific task suggestions');
  console.log('✅ AC4: Follow-up tasks for fixing validation failures created');
  
  // Test 5: Validator execution and exit code mapping
  console.log('\n🧪 AC5: Validator execution and exit code mapping');
  
  // Test with custom config that enables validators
  const testConfig = {
    "$schema": "./schemas/brain-config.schema.json",
    "limits": { "maxLocAdded": 450, "maxFiles": 15 },
    "domains": ["backend", "frontend", "docs", "infra", "ops", "data"],
    "tools": { 
      "codex": true, "aider": true, "openaiPlanner": true, "firecrawl": true, 
      "sequential": true, "github": false, "zapier": false, "terminal": true,
      "eslint": true, "typecheck": false, "unitTests": false
    },
    "retry": { "planner": { "retries": 2, "backoffMs": [250, 750] } },
    "modes": { "default": "execute+verify" },
    "budget": { "token": 60000, "timeSeconds": 360 },
    "auto": { "enabled": true, "defaultTarget": "phase-1", "maxBatches": 6, "maxMinutes": 8, "maxConsecFails": 2 },
    "governance": { "maxBatchTasks": 10, "splitThresholdLoc": 300, "budgetStrategy": "conservative" },
    "tokens": { "plannerModel": "gpt-4o-mini", "temperature": 0.2, "maxTokens": 2000 }
  };
  
  const originalConfig = fs.readFileSync('brain.config.json', 'utf8');
  
  try {
    fs.writeFileSync('brain.config.json', JSON.stringify(testConfig, null, 2));
    
    const normalLog = runValidationTest('AC5: Normal validation execution', []);
    
    // Verify proper status mapping
    assert(['ok', 'fail'].includes(normalLog.validation.lint), 
      'AC5: ESLint should run and return ok or fail (not skipped)');
    assert(normalLog.validation.typecheck === 'skipped', 
      'AC5: TypeCheck should be skipped when disabled');
    assert(normalLog.validation.tests === 'skipped', 
      'AC5: Tests should be skipped when disabled');
      
    console.log(`✅ AC5: Validators execute correctly (lint: ${normalLog.validation.lint})`);
    
  } finally {
    fs.writeFileSync('brain.config.json', originalConfig);
  }
  
  // Final summary
  console.log('\n🎉 Wave 6 Implementation Verification Complete!');
  console.log('='*60);
  console.log('✅ All acceptance criteria verified:');
  console.log('   • runValidators calls enabled validator runners');
  console.log('   • Exit codes properly mapped to ok/fail/skipped');
  console.log('   • CLI flag --force-validator-fail works');
  console.log('   • Environment variable PB_BRAIN_FORCE_VALIDATION_FAIL works');
  console.log('   • Outcome status set to FAIL on validation failure');
  console.log('   • Remediation tasks created with validation details');
  console.log('   • Follow-up tasks generated for fixing failures');
  console.log('\n🚀 Wave 6: Validation Pipeline & Forced-Fail Mechanism - COMPLETE');
}

if (require.main === module) {
  main();
}