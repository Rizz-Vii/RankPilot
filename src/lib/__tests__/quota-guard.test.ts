/**
 * Unit tests for Quota Guard Middleware
 * Tests HTTP 429 responses and middleware integration
 */

import { expect } from 'chai';
import { NextRequest } from 'next/server';
import { quotaGuard, quotaGuards, extractTeamId, shouldEnforceQuota } from '@/lib/middleware/quota-guard';
import { adminDb } from '@/lib/firebase-admin';

describe('Quota Guard Middleware', function () {
  this.timeout(30000);
  
  const testTeamId = 'test_team_guard_wave2';
  const testPlan = 'starter';
  
  beforeEach(async function () {
    // Clean up test data
    const today = new Date().toISOString().slice(0, 10);
    const docId = `${testTeamId}_${today}`;
    
    try {
      await adminDb.collection('teamQuotas').doc(docId).delete();
    } catch (error) {
      // Document might not exist, which is fine
    }
  });

  describe('quotaGuard', function () {
    it('should allow requests within quota limits', async function () {
      const request = new NextRequest('https://example.com/api/seo-audit', {
        method: 'POST',
      });

      const result = await quotaGuard(request, {
        quotaType: 'seoAnalyses24h',
        teamId: testTeamId,
        plan: testPlan,
      });

      expect(result.allowed).to.be.true;
      expect(result.quotaInfo).to.not.be.undefined;
      expect(result.quotaInfo!.used).to.equal(1);
      expect(result.quotaInfo!.limit).to.equal(25);
      expect(result.quotaInfo!.remaining).to.equal(24);
      expect(result.response).to.be.undefined;
    });

    it('should return 429 response when quota exceeded', async function () {
      const request = new NextRequest('https://example.com/api/seo-audit', {
        method: 'POST',
      });

      const debugLimit = 1;

      // First request should succeed
      const result1 = await quotaGuard(request, {
        quotaType: 'seoAnalyses24h',
        teamId: testTeamId,
        plan: testPlan,
        debugLimit,
      });
      expect(result1.allowed).to.be.true;

      // Second request should fail with 429
      const result2 = await quotaGuard(request, {
        quotaType: 'seoAnalyses24h',
        teamId: testTeamId,
        plan: testPlan,
        debugLimit,
      });

      expect(result2.allowed).to.be.false;
      expect(result2.response).to.not.be.undefined;
      expect(result2.response!.status).to.equal(429);

      // Check response body
      const responseBody = await result2.response!.json();
      expect(responseBody.error).to.include('quota exceeded');
      expect(responseBody.code).to.equal('QUOTA_EXCEEDED');
      expect(responseBody.quotaType).to.equal('seoAnalyses24h');
      expect(responseBody.retryAfter).to.equal('24h');

      // Check headers
      expect(result2.response!.headers.get('Retry-After')).to.equal('86400');
      expect(result2.response!.headers.get('Content-Type')).to.equal('application/json');
    });

    it('should return 400 when teamId is missing', async function () {
      const request = new NextRequest('https://example.com/api/seo-audit', {
        method: 'POST',
      });

      const result = await quotaGuard(request, {
        quotaType: 'seoAnalyses24h',
        // teamId missing
        plan: testPlan,
      });

      expect(result.allowed).to.be.false;
      expect(result.response).to.not.be.undefined;
      expect(result.response!.status).to.equal(400);

      const responseBody = await result.response!.json();
      expect(responseBody.error).to.include('Team ID required');
      expect(responseBody.code).to.equal('MISSING_TEAM_ID');
    });

    it('should support read-only quota checks', async function () {
      // First, use some quota
      await quotaGuard(new NextRequest('https://example.com/api/seo-audit'), {
        quotaType: 'seoAnalyses24h',
        teamId: testTeamId,
        plan: testPlan,
      });

      // Then do read-only check
      const result = await quotaGuard(new NextRequest('https://example.com/api/seo-audit'), {
        quotaType: 'seoAnalyses24h',
        teamId: testTeamId,
        plan: testPlan,
        skipEnforcement: true,
      });

      expect(result.allowed).to.be.true;
      expect(result.quotaInfo!.used).to.equal(1);
      expect(result.response).to.be.undefined;

      // Check again - usage should not have incremented
      const result2 = await quotaGuard(new NextRequest('https://example.com/api/seo-audit'), {
        quotaType: 'seoAnalyses24h',
        teamId: testTeamId,
        plan: testPlan,
        skipEnforcement: true,
      });

      expect(result2.quotaInfo!.used).to.equal(1); // Should still be 1
    });
  });

  describe('quotaGuards helpers', function () {
    it('should provide specific quota guards for different services', async function () {
      const request = new NextRequest('https://example.com/api/crawler');

      // Test crawler guard
      const crawlerResult = await quotaGuards.crawlerGuard(request, testTeamId, testPlan);
      expect(crawlerResult.allowed).to.be.true;
      expect(crawlerResult.quotaInfo!.quotaType).to.equal('crawlerRuns24h');

      // Test SEO analysis guard
      const seoResult = await quotaGuards.seoAnalysisGuard(request, testTeamId, testPlan);
      expect(seoResult.allowed).to.be.true;
      expect(seoResult.quotaInfo!.quotaType).to.equal('seoAnalyses24h');

      // Test NeuroSEO guard
      const neuroseoResult = await quotaGuards.neuroseoGuard(request, testTeamId, testPlan);
      expect(neuroseoResult.allowed).to.be.true;
      expect(neuroseoResult.quotaInfo!.quotaType).to.equal('neuroseoAnalyses24h');

      // Test report guard
      const reportResult = await quotaGuards.reportGuard(request, testTeamId, testPlan);
      expect(reportResult.allowed).to.be.true;
      expect(reportResult.quotaInfo!.quotaType).to.equal('reportGenerations24h');
    });
  });

  describe('extractTeamId', function () {
    it('should extract teamId from URL parameters', function () {
      const request = new NextRequest('https://example.com/api/test?teamId=team123');
      const teamId = extractTeamId(request);
      expect(teamId).to.equal('team123');
    });

    it('should extract teamId from headers', function () {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-team-id': 'team456',
        },
      });
      const teamId = extractTeamId(request);
      expect(teamId).to.equal('team456');
    });

    it('should prioritize URL parameters over headers', function () {
      const request = new NextRequest('https://example.com/api/test?teamId=team_url', {
        headers: {
          'x-team-id': 'team_header',
        },
      });
      const teamId = extractTeamId(request);
      expect(teamId).to.equal('team_url');
    });

    it('should return null when no teamId found', function () {
      const request = new NextRequest('https://example.com/api/test');
      const teamId = extractTeamId(request);
      expect(teamId).to.be.null;
    });
  });

  describe('shouldEnforceQuota', function () {
    it('should identify routes that need quota enforcement', function () {
      const testCases = [
        { path: '/api/seo-audit', expected: { enforce: true, quotaType: 'crawlerRuns24h' } },
        { path: '/api/crawler/run', expected: { enforce: true, quotaType: 'crawlerRuns24h' } },
        { path: '/api/neuroseo/analyze', expected: { enforce: true, quotaType: 'neuroseoAnalyses24h' } },
        { path: '/api/seo/analysis', expected: { enforce: true, quotaType: 'seoAnalyses24h' } },
        { path: '/api/reports/generate', expected: { enforce: true, quotaType: 'reportGenerations24h' } },
        { path: '/api/health', expected: { enforce: false } },
        { path: '/api/user/profile', expected: { enforce: false } },
      ];

      testCases.forEach(({ path, expected }) => {
        const result = shouldEnforceQuota(path);
        expect(result.enforce).to.equal(expected.enforce, `Failed for path: ${path}`);
        if (expected.quotaType) {
          expect(result.quotaType).to.equal(expected.quotaType, `Failed quota type for path: ${path}`);
        }
      });
    });
  });

  describe('error handling', function () {
    it('should handle database errors gracefully', async function () {
      // Use invalid team ID that might cause database errors
      const request = new NextRequest('https://example.com/api/seo-audit');

      // Mock database error by using extremely long team ID
      const invalidTeamId = 'x'.repeat(1000);

      const result = await quotaGuard(request, {
        quotaType: 'seoAnalyses24h',
        teamId: invalidTeamId,
        plan: testPlan,
      });

      expect(result.allowed).to.be.false;
      expect(result.response).to.not.be.undefined;
      // Should return 500 for internal errors, not 429
      expect(result.response!.status).to.equal(500);

      const responseBody = await result.response!.json();
      expect(responseBody.code).to.equal('QUOTA_CHECK_FAILED');
    });
  });
});