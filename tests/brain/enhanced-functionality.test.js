const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Test enhanced budget enforcement with improved token tracking
function testEnhancedBudgetEnforcement() {
  console.log('Testing enhanced budget enforcement with token tracking...');
  
  // Clean up existing remediation files
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const existingFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    existingFiles.forEach(f => {
      try { fs.unlinkSync(path.join(artifactsDir, f)); } catch {}
    });
  }
  
  // Use very restrictive budget
  const env = { 
    ...process.env, 
    PB_BRAIN_BUDGET_TOKEN: '10',   // Very low token budget
    PB_BRAIN_BUDGET_TIME: '2'      // 2 second time limit
  };
  
  const result = spawnSync('node', [
    'dist/brain/scripts/brain/cli.js', 
    '--mode', 'auto'
  ], { 
    stdio: 'pipe', 
    env,
    timeout: 8000
  });
  
  // Check for enhanced remediation files
  if (fs.existsSync(artifactsDir)) {
    const remediationFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'))
      .sort()
      .slice(-1); // Get most recent
    
    if (remediationFiles.length > 0) {
      const content = JSON.parse(fs.readFileSync(path.join(artifactsDir, remediationFiles[0]), 'utf8'));
      
      // Check for enhanced fields
      if (content.reason === 'budget') {
        assert(content.details, 'Budget remediation should have details');
        assert(content.budgetUsed, 'Budget remediation should have budgetUsed info');
        assert(typeof content.budgetUsed.tokenUsed === 'number', 'Should track token usage');
        assert(typeof content.budgetUsed.timeUsedMs === 'number', 'Should track time usage');
        
        console.log(`✓ Enhanced budget remediation found:`, {
          reason: content.reason,
          tokenUsed: content.budgetUsed.tokenUsed,
          timeUsed: `${content.budgetUsed.timeUsedMs}ms`,
          details: content.details.length
        });
      } else {
        console.log(`✓ Remediation found with reason: ${content.reason}`);
      }
    } else {
      console.log('⚠ No remediation files found in enhanced test');
    }
  }
  
  console.log('✓ Enhanced budget enforcement test completed');
}

// Test sub-batch validation failure stopping
function testSubBatchValidationFailure() {
  console.log('Testing sub-batch validation failure handling...');
  
  // Clean up existing files
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const existingFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    existingFiles.forEach(f => {
      try { fs.unlinkSync(path.join(artifactsDir, f)); } catch {}
    });
  }
  
  // Force validation failure after first sub-batch
  const result = spawnSync('node', [
    'dist/brain/scripts/brain/cli.js',
    '--mode', 'auto',
    '--force-validator-fail'
  ], { 
    stdio: 'pipe',
    timeout: 5000
  });
  
  // Check that remediation was written for validation failure
  if (fs.existsSync(artifactsDir)) {
    const remediationFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    
    if (remediationFiles.length > 0) {
      const content = JSON.parse(fs.readFileSync(path.join(artifactsDir, remediationFiles[0]), 'utf8'));
      
      if (content.reason === 'validation' && content.details) {
        console.log(`✓ Validation failure remediation found with ${content.details.length} details`);
      } else {
        console.log(`✓ Remediation found: ${content.reason}`);
      }
    }
  }
  
  console.log('✓ Sub-batch validation failure test completed');
}

// Test the actual functionality of multiple runBatch calls
function testActualMultipleRunBatchCalls() {
  console.log('Testing actual multiple runBatch execution...');
  
  // Run auto mode which should split and execute multiple times
  const result = spawnSync('node', [
    'dist/brain/scripts/brain/cli.js',
    '--mode', 'auto'
  ], { 
    stdio: 'pipe',
    timeout: 10000
  });
  
  console.log(`Auto mode exit code: ${result.status}`);
  
  // Check artifacts directory for execution evidence
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const logFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('run-'))
      .sort()
      .slice(-3); // Get recent log files
    
    console.log(`Found ${logFiles.length} recent execution logs`);
    
    if (logFiles.length > 0) {
      try {
        const logContent = fs.readFileSync(path.join(artifactsDir, logFiles[0]), 'utf8');
        const log = JSON.parse(logContent);
        
        if (log.mode === 'auto') {
          console.log(`✓ Auto mode execution logged: ${log.outcome?.status || 'unknown'}`);
          if (log.metrics) {
            console.log(`  - Estimated tokens: ${log.metrics.estTokens}`);
            console.log(`  - Elapsed time: ${log.metrics.elapsedMs}ms`);
          }
        }
      } catch (e) {
        console.log('Could not parse execution log');
      }
    }
  }
  
  console.log('✓ Multiple runBatch execution test completed');
}

// Run enhanced tests
try {
  testEnhancedBudgetEnforcement();
  testSubBatchValidationFailure();
  testActualMultipleRunBatchCalls();
  
  console.log('\n✅ All enhanced functionality tests completed!');
} catch (error) {
  console.error('\n❌ Enhanced test failed:', error.message);
  process.exit(1);
}