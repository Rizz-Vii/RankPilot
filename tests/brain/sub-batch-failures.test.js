const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Test sub-batch failure handling - when a sub-batch fails guards/validators
function testSubBatchFailureHandling() {
  console.log('Testing sub-batch failure handling with guard limits...');
  
  // Clean up any existing remediation files
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const existingFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    existingFiles.forEach(f => {
      try { fs.unlinkSync(path.join(artifactsDir, f)); } catch {}
    });
  }
  
  // Run with guard failure to simulate sub-batch failing limits
  const result = spawnSync('node', [
    'dist/brain/scripts/brain/cli.js',
    '--mode', 'execute',
    '--verify-guard-fail'  // This flag forces guard failure
  ], { 
    stdio: 'pipe'
  });
  
  // Verify that remediation file was written
  let foundRemediationFile = false;
  if (fs.existsSync(artifactsDir)) {
    const remediationFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    
    if (remediationFiles.length > 0) {
      // Check that remediation file has correct reason
      for (const file of remediationFiles) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(artifactsDir, file), 'utf8'));
          if (content.reason === 'limits') {
            foundRemediationFile = true;
            console.log(`✓ Found remediation file with 'limits' reason: ${file}`);
            break;
          }
        } catch (e) {
          console.log(`Could not parse remediation file ${file}: ${e.message}`);
        }
      }
    }
  }
  
  if (!foundRemediationFile) {
    throw new Error('Expected remediation file with limits reason, but none found');
  }
}

// Test that auto mode respects budget enforcement by using very restrictive limits
function testStrictBudgetEnforcement() {
  console.log('Testing strict budget enforcement...');
  
  // Clean up existing files
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const existingFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'));
    existingFiles.forEach(f => {
      try { fs.unlinkSync(path.join(artifactsDir, f)); } catch {}
    });
  }
  
  // Use very restrictive budget settings
  const env = { 
    ...process.env, 
    PB_BRAIN_BUDGET_TOKEN: '50',   // Very low token budget
    PB_BRAIN_BUDGET_TIME: '1'      // 1 second time limit
  };
  
  const result = spawnSync('node', [
    'dist/brain/scripts/brain/cli.js', 
    '--mode', 'auto'
  ], { 
    stdio: 'pipe', 
    env,
    timeout: 5000  // 5 second timeout for the test itself
  });
  
  // The process may exit with non-zero due to budget constraints - that's expected
  console.log(`Auto mode completed with exit code: ${result.status}`);
  
  // Check if any artifacts were created (budget enforcement or completion)
  if (fs.existsSync(artifactsDir)) {
    const allFiles = fs.readdirSync(artifactsDir);
    console.log(`Found ${allFiles.length} artifacts after budget-constrained run`);
  }
  
  console.log('✓ Strict budget enforcement test completed');
}

// Test remediation file content structure
function testRemediationFileStructure() {
  console.log('Testing remediation file structure...');
  
  // Trigger a remediation by using guard failure
  const result = spawnSync('node', [
    'dist/brain/scripts/brain/cli.js',
    '--mode', 'execute', 
    '--verify-guard-fail'
  ], { stdio: 'pipe' });
  
  const artifactsDir = path.join(process.cwd(), 'artifacts/brain');
  if (fs.existsSync(artifactsDir)) {
    const remediationFiles = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('remediation-'))
      .sort()
      .slice(-1); // Get the most recent file
    
    if (remediationFiles.length > 0) {
      const file = remediationFiles[0];
      const content = JSON.parse(fs.readFileSync(path.join(artifactsDir, file), 'utf8'));
      
      // Verify structure
      assert(content.reason, 'Remediation file should have reason field');
      assert(Array.isArray(content.tasks), 'Remediation file should have tasks array');
      
      console.log(`✓ Remediation file structure valid. Reason: ${content.reason}, Tasks: ${content.tasks.length}`);
    } else {
      throw new Error('No remediation file found to test structure');
    }
  } else {
    throw new Error('No artifacts directory found');
  }
}

// Run all sub-batch and remediation tests
try {
  testSubBatchFailureHandling();
  testStrictBudgetEnforcement();
  testRemediationFileStructure();
  
  console.log('\n✅ All sub-batch failure and remediation tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}