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
  console.log('Testing normal validation pipeline...');
  
  // Create a test config with validators enabled
  const testConfig = {
    "$schema": "./schemas/brain-config.schema.json",
    "limits": { "maxLocAdded": 450, "maxFiles": 15 },
    "domains": ["backend", "frontend", "docs", "infra", "ops", "data"],
    "tools": { 
      "codex": true, 
      "aider": true, 
      "openaiPlanner": true, 
      "firecrawl": true, 
      "sequential": true, 
      "github": false, 
      "zapier": false, 
      "terminal": true,
      "eslint": true,
      "typecheck": false,  // Keep false to avoid compilation issues in test
      "unitTests": false   // Keep false to avoid test dependencies
    },
    "retry": { "planner": { "retries": 2, "backoffMs": [250, 750] } },
    "modes": { "default": "execute+verify" },
    "budget": { "token": 60000, "timeSeconds": 360 },
    "auto": { "enabled": true, "defaultTarget": "phase-1", "maxBatches": 6, "maxMinutes": 8, "maxConsecFails": 2 },
    "governance": { "maxBatchTasks": 10, "splitThresholdLoc": 300, "budgetStrategy": "conservative" },
    "tokens": { "plannerModel": "gpt-4o-mini", "temperature": 0.2, "maxTokens": 2000 }
  };
  
  // Backup original config
  const originalConfig = fs.readFileSync('brain.config.json', 'utf8');
  
  try {
    // Write test config
    fs.writeFileSync('brain.config.json', JSON.stringify(testConfig, null, 2));
    
    // Build brain module
    const buildResult = spawnSync('npm', ['run', '-s', 'build:brain'], { stdio: 'pipe' });
    if (buildResult.status !== 0) {
      throw new Error('Brain build failed');
    }
    
    // Test 1: Run validation without forced fail
    console.log('Test 1: Running normal validation');
    const normalResult = spawnSync('node', ['dist/brain/scripts/brain/cli.js', '--mode', 'execute'], { 
      stdio: 'pipe',
      timeout: 30000
    });
    
    assert(normalResult.status === 0, 'Normal CLI run should complete successfully');
    
    // Check run log
    const latestRunLog = latestArtifact('artifacts/brain', 'run-');
    assert(latestRunLog, 'Run log should exist');
    
    const runLogContent = JSON.parse(fs.readFileSync(latestRunLog, 'utf8'));
    assert(runLogContent.validation, 'Validation results should exist');
    
    // With eslint enabled, it should either pass or fail (not skipped)
    assert(runLogContent.validation.lint !== 'skipped', 'ESLint should run (not be skipped)');
    console.log(`ESLint result: ${runLogContent.validation.lint}`);
    
    // Typecheck should be skipped since we disabled it
    assert(runLogContent.validation.typecheck === 'skipped', 'TypeCheck should be skipped');
    
    // Tests should be skipped since we disabled them
    assert(runLogContent.validation.tests === 'skipped', 'Tests should be skipped');
    
    console.log('Normal validation pipeline test passed!');
    console.log('✓ Enabled validators run correctly');
    console.log('✓ Disabled validators are skipped');
    console.log('✓ Validation results are properly recorded');
    
  } finally {
    // Restore original config
    fs.writeFileSync('brain.config.json', originalConfig);
  }
})();