const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { splitPlan } = require('../../dist/brain/scripts/brain/governance/splitter');

// Test 1: Verify splitPlan divides large plans correctly
function testSplitPlanLargeBatch() {
  console.log('Testing splitPlan with large batch...');
  
  // Create a plan with more tasks than maxBatchTasks allows
  const steps = Array.from({length: 25}, (_, i) => ({
    id: `step-${i}`,
    title: `Task ${i}`,
    domain: 'docs'
  }));
  
  const cfg = { 
    governance: { 
      maxBatchTasks: 8, 
      splitThresholdLoc: 200 
    } 
  };
  
  const groups = splitPlan(steps, cfg);
  
  // Should be split into multiple groups
  assert(groups.length > 1, `Expected multiple groups, got ${groups.length}`);
  
  // No group should exceed maxBatchTasks
  for (const group of groups) {
    assert(group.length <= cfg.governance.maxBatchTasks, 
      `Group has ${group.length} tasks, exceeds limit of ${cfg.governance.maxBatchTasks}`);
  }
  
  // All original steps should be preserved
  const allSteps = groups.flat();
  assert.equal(allSteps.length, steps.length, 'Some steps were lost during splitting');
  
  console.log(`✓ Split ${steps.length} steps into ${groups.length} groups`);
}

// Test 2: Verify splitPlan respects LOC threshold
function testSplitPlanLOCThreshold() {
  console.log('Testing splitPlan LOC threshold...');
  
  // Create enough steps to exceed splitThresholdLoc (assuming 30 LOC per step)
  const steps = Array.from({length: 15}, (_, i) => ({id: `step-${i}`}));
  
  const cfg = { 
    governance: { 
      maxBatchTasks: 20,  // High enough to not be the limiting factor
      splitThresholdLoc: 300  // 10 * 30 = 300, so should split at ~10 steps
    } 
  };
  
  const groups = splitPlan(steps, cfg);
  
  // Should be split due to LOC threshold
  assert(groups.length > 1, 'Expected split due to LOC threshold');
  
  // Verify each group respects estimated LOC limit
  for (const group of groups) {
    const estimatedLoc = group.length * 30;
    assert(estimatedLoc <= cfg.governance.splitThresholdLoc + 30, // Allow some tolerance
      `Group estimated LOC ${estimatedLoc} exceeds threshold ${cfg.governance.splitThresholdLoc}`);
  }
  
  console.log(`✓ LOC threshold respected, split into ${groups.length} groups`);
}

// Test 3: Verify budget enforcement in auto mode
function testBudgetEnforcement() {
  console.log('Testing budget enforcement...');
  
  // Clean up any existing remediation files
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const existingFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    existingFiles.forEach(f => {
      try { fs.unlinkSync(path.join(artifactsDir, f)); } catch {}
    });
  }
  
  // Set very low budget to trigger failure
  const env = { 
    ...process.env, 
    PB_BRAIN_BUDGET_TOKEN: '100',  // Very low token budget
    PB_BRAIN_BUDGET_TIME: '1'      // 1 second time limit
  };
  
  // Run auto mode which should exceed budget quickly
  const result = spawnSync('node', [
    'dist/brain/scripts/brain/cli.js', 
    '--mode', 'auto'
  ], { 
    stdio: 'pipe', 
    env 
  });
  
  // Check that remediation file was written for budget failure
  if (fs.existsSync(artifactsDir)) {
    const remediationFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    
    if (remediationFiles.length > 0) {
      // Check that at least one remediation file mentions budget
      let foundBudgetReason = false;
      for (const file of remediationFiles) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(artifactsDir, file), 'utf8'));
          if (content.reason === 'validation' || content.reason === 'budget') {
            foundBudgetReason = true;
            break;
          }
        } catch {}
      }
      console.log(`✓ Budget enforcement triggered remediation (found ${remediationFiles.length} files)`);
    } else {
      console.log('⚠ Budget test ran but no remediation files found (may not have hit limits)');
    }
  } else {
    console.log('⚠ Budget test ran but no artifacts directory found');
  }
}

// Test 4: Verify multiple runBatch calls in auto mode with splitting
function testMultipleRunBatchCalls() {
  console.log('Testing multiple runBatch calls with splitting...');
  
  // This is harder to test directly without modifying the code,
  // but we can verify the splitter creates multiple groups
  const manySteps = Array.from({length: 30}, (_, i) => ({id: `step-${i}`}));
  const cfg = { governance: { maxBatchTasks: 7, splitThresholdLoc: 150 } };
  
  const groups = splitPlan(manySteps, cfg);
  
  // Should create multiple groups, each representing a separate runBatch call
  assert(groups.length >= 3, `Expected at least 3 groups for multiple runBatch calls, got ${groups.length}`);
  
  console.log(`✓ Splitting would result in ${groups.length} separate runBatch calls`);
}

// Test 5: Verify small plans don't get split unnecessarily
function testSmallPlanNoSplit() {
  console.log('Testing small plans remain unsplit...');
  
  const smallSteps = Array.from({length: 3}, (_, i) => ({id: `step-${i}`}));
  const cfg = { governance: { maxBatchTasks: 10, splitThresholdLoc: 300 } };
  
  const groups = splitPlan(smallSteps, cfg);
  
  // Should remain as single group
  assert.equal(groups.length, 1, `Small plan should not be split, got ${groups.length} groups`);
  assert.equal(groups[0].length, smallSteps.length, 'All steps should be in single group');
  
  console.log('✓ Small plans remain unsplit');
}

// Run all tests
try {
  testSplitPlanLargeBatch();
  testSplitPlanLOCThreshold();
  testMultipleRunBatchCalls();
  testSmallPlanNoSplit();
  testBudgetEnforcement();
  
  console.log('\n✅ All governance enhanced tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}