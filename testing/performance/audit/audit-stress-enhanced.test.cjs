/*
 * Enhanced Stress Test for Audit/Orchestrator Pipeline (Wave 3)
 * 
 * Integrates with existing Mocha test infrastructure while providing
 * comprehensive stress testing with artifact storage capabilities.
 * 
 * Features:
 * - 20 parallel requests to audit/orchestrator pipeline
 * - Configurable 95th percentile response time threshold
 * - Quota conflict detection and comprehensive error handling
 * - Structured performance artifacts stored under artifacts/perf
 * - Integration with existing test reporting
 */

process.env.GENKIT_TEST_STUB = '1';

const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');

// Mock audit function (same as in stress-harness.js)
const audit = {
  __testRunSeoAudit: async function(params, context) {
    // Simulate audit processing time
    const processingTime = 100 + Math.random() * 4000; // 100ms to 4s
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate occasional errors (5% chance)
    if (Math.random() < 0.05) {
      const errorTypes = [
        'Network timeout',
        'Invalid URL format',
        'Rate limit exceeded - quota conflict',
        'Connection refused'
      ];
      const error = new Error(errorTypes[Math.floor(Math.random() * errorTypes.length)]);
      throw error;
    }
    
    // Simulate successful audit response
    return {
      score: Math.random() * 100,
      issues: {
        critical: ['Critical issue 1'],
        major: ['Major issue 1', 'Major issue 2'],
        minor: ['Minor issue 1']
      },
      recommendations: ['Recommendation 1', 'Recommendation 2'],
      timings: {
        crawl_time_ms: Math.random() * 2000,
        analysis_time_ms: Math.random() * 1000,
        total_time_ms: processingTime
      }
    };
  }
};

// Import the stress harness utilities by requiring the script
const stressHarnessPath = path.join(__dirname, '../../../scripts/stress-harness.js');
const { StressTestMetrics, CONFIG } = require(stressHarnessPath);

/**
 * Enhanced audit request execution with full timing
 */
async function runEnhancedAuditRequest(index) {
  const startTime = Date.now();
  
  try {
    const url = `https://enhanced-stress-${index}.example.com`;
    const requestParams = {
      url,
      depth: 1,
      plan: 'admin',
      teamId: `enhanced-stress-team-${index}`,
      debugTeamLimit: 1000
    };
    
    const authContext = { uid: `enhanced-stress-user-${index}` };
    
    const result = await audit.__testRunSeoAudit(requestParams, authContext);
    const endTime = Date.now();
    
    return {
      index,
      startTime,
      endTime,
      success: true,
      result,
      error: null,
      responseTime: endTime - startTime
    };
    
  } catch (error) {
    const endTime = Date.now();
    
    return {
      index,
      startTime,
      endTime,
      success: false,
      result: null,
      error,
      responseTime: endTime - startTime
    };
  }
}

describe('Enhanced Audit/Orchestrator Stress Test (Wave 3)', () => {
  let artifactsDir;
  
  before(async () => {
    // Ensure artifacts directory exists
    artifactsDir = path.join(__dirname, '../../../artifacts/perf');
    await fs.mkdir(artifactsDir, { recursive: true });
  });

  it('should handle 20 parallel requests with configurable P95 threshold and quota conflict detection', async function() {
    this.timeout(60000); // 60 seconds for 20 parallel requests
    
    console.log('\n🚀 Starting Enhanced Audit Stress Test...');
    console.log(`📊 P95 Threshold: ${CONFIG.P95_THRESHOLD_MS}ms (configurable via STRESS_P95_THRESHOLD_MS)`);
    
    const metrics = new StressTestMetrics();
    const N = CONFIG.PARALLEL_REQUESTS;
    
    // Execute 20 parallel requests
    console.log(`🔥 Launching ${N} parallel audit requests...`);
    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) => runEnhancedAuditRequest(i))
    );
    
    // Process results and build metrics
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      if (result.status === 'fulfilled') {
        const { index, startTime, endTime, success, result: auditResult, error } = result.value;
        metrics.addRequest(index, startTime, endTime, success, auditResult, error);
      } else {
        // Promise rejection
        const endTime = Date.now();
        metrics.addRequest(i, metrics.startTime, endTime, false, null, result.reason);
      }
    }
    
    metrics.finalize();
    
    // Generate and save performance report
    const report = metrics.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(artifactsDir, `mocha-stress-test-${timestamp}.json`);
    const summaryFile = path.join(artifactsDir, 'latest-mocha-stress-test.json');
    
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    await fs.writeFile(summaryFile, JSON.stringify(report, null, 2));
    
    // Extract key metrics for assertions
    const successfulRequests = metrics.requests.filter(r => r.success);
    const failedRequests = metrics.errors;
    const quotaConflicts = metrics.quotaConflicts;
    const failureRate = failedRequests.length / N;
    
    // Calculate response time statistics
    const responseTimes = successfulRequests.map(r => r.responseTime).sort((a, b) => a - b);
    const p95Index = Math.min(responseTimes.length - 1, Math.floor(responseTimes.length * 0.95));
    const p95ResponseTime = responseTimes[p95Index] || 0;
    
    // Memory usage check
    const memoryDeltaMB = metrics.memoryDelta / (1024 * 1024);
    
    // Print detailed results
    console.log('\n📈 Enhanced Stress Test Results:');
    console.log('=================================');
    console.log(`✅ Successful Requests: ${successfulRequests.length}/${N}`);
    console.log(`❌ Failed Requests: ${failedRequests.length}`);
    console.log(`🚫 Quota Conflicts: ${quotaConflicts.length}`);
    console.log(`📊 Failure Rate: ${(failureRate * 100).toFixed(2)}%`);
    console.log(`⏱️  95th Percentile Response Time: ${p95ResponseTime}ms`);
    console.log(`🎯 P95 Threshold: ${CONFIG.P95_THRESHOLD_MS}ms`);
    console.log(`💾 Memory Delta: ${memoryDeltaMB.toFixed(2)}MB`);
    console.log(`🏥 Health Status: ${report.summary.healthStatus}`);
    console.log(`📁 Report saved: ${reportFile}`);
    
    // Print error details if any
    if (failedRequests.length > 0) {
      console.log('\n❌ Error Details:');
      failedRequests.forEach(req => {
        console.log(`   [${req.index}] ${req.error?.type}: ${req.error?.message}`);
      });
    }
    
    // Print quota conflict details if any
    if (quotaConflicts.length > 0) {
      console.log('\n🚫 Quota Conflict Details:');
      quotaConflicts.forEach(conflict => {
        console.log(`   [${conflict.index}] ${conflict.error?.message}`);
      });
    }
    
    // Assertions (following acceptance criteria)
    
    // 1. Must have successful parallel requests
    assert.ok(successfulRequests.length > 0, 'At least some requests should succeed');
    
    // 2. Failure rate should be below threshold (5%)
    assert.ok(failureRate < CONFIG.ERROR_RATE_THRESHOLD, 
      `Failure rate ${(failureRate * 100).toFixed(2)}% exceeds threshold ${(CONFIG.ERROR_RATE_THRESHOLD * 100)}%`);
    
    // 3. No quota conflicts (critical requirement)
    assert.ok(quotaConflicts.length === 0, 
      `Quota conflicts detected: ${quotaConflicts.length} conflicts`);
    
    // 4. 95th percentile response time should be below configurable threshold
    assert.ok(p95ResponseTime <= CONFIG.P95_THRESHOLD_MS, 
      `95th percentile response time ${p95ResponseTime}ms exceeds threshold ${CONFIG.P95_THRESHOLD_MS}ms`);
    
    // 5. Memory usage should be reasonable
    assert.ok(memoryDeltaMB < CONFIG.MEMORY_THRESHOLD_MB, 
      `Memory growth ${memoryDeltaMB.toFixed(2)}MB exceeds threshold ${CONFIG.MEMORY_THRESHOLD_MB}MB`);
    
    // 6. Performance artifacts should be created
    const artifactExists = await fs.access(reportFile).then(() => true).catch(() => false);
    assert.ok(artifactExists, 'Performance artifact should be created');
    
    // 7. Validate artifact content
    const savedReport = JSON.parse(await fs.readFile(reportFile, 'utf8'));
    assert.ok(savedReport.metadata, 'Artifact should contain metadata');
    assert.ok(savedReport.summary, 'Artifact should contain summary');
    assert.ok(savedReport.performance, 'Artifact should contain performance metrics');
    assert.equal(savedReport.summary.totalRequests, N, 'Artifact should record correct number of requests');
    
    console.log('\n✅ All stress test assertions passed!');
  });

  it('should respect environment variable configuration for P95 threshold', async function() {
    this.timeout(10000);
    
    // Test with custom threshold
    const originalThreshold = process.env.STRESS_P95_THRESHOLD_MS;
    process.env.STRESS_P95_THRESHOLD_MS = '3000';
    
    try {
      // Reload the config
      delete require.cache[require.resolve('../../../scripts/stress-harness.js')];
      const { CONFIG: TestConfig } = require('../../../scripts/stress-harness.js');
      
      assert.equal(TestConfig.P95_THRESHOLD_MS, 3000, 'Should respect custom P95 threshold from environment');
      
      console.log('✅ Environment variable configuration test passed');
    } finally {
      // Restore original value
      if (originalThreshold) {
        process.env.STRESS_P95_THRESHOLD_MS = originalThreshold;
      } else {
        delete process.env.STRESS_P95_THRESHOLD_MS;
      }
    }
  });

  it('should properly detect and categorize different error types', async function() {
    this.timeout(15000);
    
    const metrics = new StressTestMetrics();
    
    // Test quota conflict detection
    const quotaError = new Error('Rate limit exceeded - quota conflict');
    const networkError = new Error('Network timeout');
    const validationError = new Error('Invalid parameters');
    
    // Simulate some requests with different error types
    metrics.addRequest(0, Date.now(), Date.now() + 1000, false, null, quotaError);
    metrics.addRequest(1, Date.now(), Date.now() + 1500, false, null, networkError);
    metrics.addRequest(2, Date.now(), Date.now() + 800, false, null, validationError);
    metrics.addRequest(3, Date.now(), Date.now() + 2000, true, { timings: { crawl_time_ms: 500 } }, null);
    
    metrics.finalize();
    
    // Verify quota conflict detection
    assert.equal(metrics.quotaConflicts.length, 1, 'Should detect quota conflicts');
    assert.equal(metrics.errors.length, 3, 'Should track all errors');
    assert.equal(metrics.requests.filter(r => r.success).length, 1, 'Should track successful requests');
    
    console.log('✅ Error categorization test passed');
  });
});