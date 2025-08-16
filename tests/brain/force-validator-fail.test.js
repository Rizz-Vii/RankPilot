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

(function main(){
  console.log('Testing --force-validator-fail mechanism...');
  
  // First build brain module
  const buildResult = spawnSync('npm', ['run', '-s', 'build:brain'], { stdio: 'pipe' });
  if (buildResult.status !== 0) {
    throw new Error('Brain build failed');
  }
  
  // Clear any existing artifacts to ensure clean test
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const oldFiles = fs.readdirSync(artifactsDir);
    const oldRunLogs = oldFiles.filter(f => f.startsWith('run-')).length;
    const oldRemediation = oldFiles.filter(f => f.startsWith('remediation-')).length;
    console.log(`Found ${oldRunLogs} run logs and ${oldRemediation} remediation files before test`);
  }
  
  // Test 1: Run CLI with --force-validator-fail flag
  console.log('Test 1: Running CLI with --force-validator-fail');
  const cliResult = spawnSync('node', ['dist/brain/scripts/brain/cli.js', '--mode', 'execute', '--force-validator-fail'], { 
    stdio: 'pipe',
    timeout: 30000
  });
  
  // The CLI should complete (exit code 0 even if validation fails)
  assert(cliResult.status === 0, `CLI should complete successfully, got status: ${cliResult.status}`);
  
  // Test 2: Check that latest run log has FAIL status
  console.log('Test 2: Checking run log for FAIL status');
  const latestRunLog = latestArtifact('artifacts/brain', 'run-');
  assert(latestRunLog, 'Run log should exist');
  
  const runLogContent = JSON.parse(fs.readFileSync(latestRunLog, 'utf8'));
  assert(runLogContent.outcome && runLogContent.outcome.status === 'FAIL', 
    `Outcome status should be FAIL, got: ${runLogContent.outcome?.status}`);
  
  // Test 3: Check validation results show at least one failure
  console.log('Test 3: Checking validation has at least one failure');
  assert(runLogContent.validation, 'Validation results should exist');
  const hasFailure = runLogContent.validation.lint === 'fail' || 
                    runLogContent.validation.typecheck === 'fail' || 
                    runLogContent.validation.tests === 'fail' || 
                    runLogContent.validation.performance === 'fail';
  assert(hasFailure, 'At least one validator should show fail status');
  
  // Test 4: Check remediation file exists
  console.log('Test 4: Checking remediation file creation');
  const latestRemediation = latestArtifact('artifacts/brain', 'remediation-');
  assert(latestRemediation, 'Remediation file should exist');
  
  const remediationContent = JSON.parse(fs.readFileSync(latestRemediation, 'utf8'));
  assert(remediationContent.reason === 'validation', 
    `Remediation reason should be validation, got: ${remediationContent.reason}`);
  assert(remediationContent.validationFailures, 'Remediation should include validation failures');
  
  // Test 5: Check follow-up tasks are created
  console.log('Test 5: Checking follow-up tasks');
  assert(runLogContent.followUps && runLogContent.followUps.length > 0, 'Follow-up tasks should exist');
  const hasRemediationTask = runLogContent.followUps.some(f => f.type === 'remediation');
  assert(hasRemediationTask, 'Should have remediation follow-up task');
  
  // Test 6: Test environment variable PB_BRAIN_FORCE_VALIDATION_FAIL
  console.log('Test 6: Testing environment variable');
  const envResult = spawnSync('node', ['dist/brain/scripts/brain/cli.js', '--mode', 'execute'], { 
    stdio: 'pipe',
    env: { ...process.env, PB_BRAIN_FORCE_VALIDATION_FAIL: '1' },
    timeout: 30000
  });
  
  assert(envResult.status === 0, 'CLI with env var should complete successfully');
  
  // Get the latest run log after env test
  const latestEnvRunLog = latestArtifact('artifacts/brain', 'run-');
  const envRunLogContent = JSON.parse(fs.readFileSync(latestEnvRunLog, 'utf8'));
  assert(envRunLogContent.outcome && envRunLogContent.outcome.status === 'FAIL', 
    'Environment variable should also trigger FAIL status');
  
  console.log('All force-validator-fail tests passed!');
  console.log('✓ CLI flag --force-validator-fail works');
  console.log('✓ Environment variable PB_BRAIN_FORCE_VALIDATION_FAIL works');
  console.log('✓ Validation failures are recorded in run log');
  console.log('✓ Remediation files are created');
  console.log('✓ Follow-up tasks are generated');
})();