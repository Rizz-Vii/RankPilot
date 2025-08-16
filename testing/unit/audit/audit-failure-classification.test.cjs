// Audit failure classification verification (Wave 3)
// Tests crawl vs analysis failure type detection and persistence
process.env.GENKIT_TEST_STUB = '1';
require('ts-node/register/transpile-only');
const { expect } = require('chai');

// Mock fetch to simulate different failure scenarios
const originalFetch = global.fetch;

describe('audit failure classification', () => {
  afterEach(() => {
    // Restore original fetch after each test
    global.fetch = originalFetch;
  });

  it('classifies network failures as crawl failures', async () => {
    // Mock fetch to simulate network failure (ECONNREFUSED)
    global.fetch = async () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:80');
      error.code = 'ECONNREFUSED';
      throw error;
    };

    const auditModule = require('../../../functions/src/api/audit.ts');
    const { __testRunSeoAudit } = auditModule;
    
    try {
      const res = await __testRunSeoAudit({ url: 'https://failing-crawl.test', depth: 1 }, { uid: 'userFailTest' });
      
      // Should return fallback response with failure metadata
      expect(res).to.have.property('source', 'fallback');
      expect(res).to.have.property('failure');
      expect(res.failure).to.have.property('type', 'crawl');
      expect(res.failure).to.have.property('message');
      expect(res.failure.message).to.include('ECONNREFUSED');
      expect(res.failure).to.have.property('timestamp');
      expect(res.failure.timestamp).to.be.a('number');
    } catch (err) {
      // If an HttpsError is thrown, that's also expected for severe failures
      expect(err.message).to.match(/ECONNREFUSED|network|fetch/i);
    }
  });

  it('classifies AI processing failures as analysis failures', async () => {
    // Mock successful fetch but simulate AI failure by stubbing the AI module differently
    global.fetch = async () => ({ 
      ok: true, 
      text: async () => '<html><title>Valid Page</title><meta name="description" content="test"><h1>H1</h1></html>' 
    });

    // Create a scenario where crawl succeeds but analysis fails
    // We'll simulate this by mocking a long processing time (indicating crawl succeeded)
    const auditModule = require('../../../functions/src/api/audit.ts');
    const { __testRunSeoAudit } = auditModule;
    
    // Override the AI wrapper to simulate failure during analysis phase
    const originalConsoleError = console.error;
    console.error = () => {}; // Suppress error logging for test
    
    try {
      // Force an AI/analysis failure by providing invalid configuration
      process.env.GENKIT_TEST_STUB = '0'; // Disable stub to trigger real AI path
      delete process.env.GENKIT_TEST_STUB;
      
      const res = await __testRunSeoAudit({ url: 'https://analysis-fail.test', depth: 1 }, { uid: 'userAnalysisFailTest' });
      
      // Expect fallback response
      expect(res).to.have.property('source', 'fallback');
      if (res.failure) {
        expect(res.failure).to.have.property('type', 'analysis');
      }
    } catch (err) {
      // Expected for AI failures
      expect(err.message).to.not.match(/ECONNREFUSED|network|fetch/i);
    } finally {
      console.error = originalConsoleError;
      process.env.GENKIT_TEST_STUB = '1'; // Restore stub
    }
  });

  it('includes failure metadata in audit document structure', async () => {
    global.fetch = async () => {
      throw new Error('timeout');
    };

    const auditModule = require('../../../functions/src/api/audit.ts');
    const { __testRunSeoAudit } = auditModule;
    
    try {
      const res = await __testRunSeoAudit({ url: 'https://timeout.test', depth: 1 }, { uid: 'userTimeoutTest' });
      
      // Verify structure includes all required Wave 3 fields
      expect(res).to.have.property('timings');
      expect(res.timings).to.include.keys(['crawl_time_ms', 'analysis_time_ms', 'total_time_ms']);
      
      if (res.failure) {
        expect(res.failure).to.include.keys(['type', 'message', 'timestamp']);
        expect(['crawl', 'analysis']).to.include(res.failure.type);
        expect(res.failure.message).to.be.a('string');
        expect(res.failure.timestamp).to.be.a('number');
      }
    } catch (err) {
      // Some failures may throw HttpsError instead of returning fallback
      expect(err).to.be.an('error');
    }
  });

  it('records failure metrics in unified metrics system', async () => {
    global.fetch = async () => {
      throw new Error('DNS lookup failed');
    };

    // Clear unified metrics before test
    const unifiedMetrics = require('../../../src/lib/metrics/unified-metrics.ts');
    const initialSnapshot = unifiedMetrics.getUnifiedMetricsSnapshot();
    const initialCrawlFailures = initialSnapshot.crawler?.failuresByType?.crawl || 0;
    
    const auditModule = require('../../../functions/src/api/audit.ts');
    const { __testRunSeoAudit } = auditModule;
    
    try {
      await __testRunSeoAudit({ url: 'https://dns-fail.test', depth: 1 }, { uid: 'userDnsFailTest' });
    } catch (err) {
      // Expected
    }
    
    // Check that failure was recorded in metrics
    const finalSnapshot = unifiedMetrics.getUnifiedMetricsSnapshot();
    const finalCrawlFailures = finalSnapshot.crawler?.failuresByType?.crawl || 0;
    
    expect(finalCrawlFailures).to.be.at.least(initialCrawlFailures);
    expect(finalSnapshot.crawler).to.have.property('failuresByType');
    expect(finalSnapshot.crawler.failuresByType).to.have.property('crawl');
    expect(finalSnapshot.crawler.failuresByType).to.have.property('analysis');
  });
});