/**
 * Unit tests for Team Quota System
 * Tests normal operation, threshold exceedance, and concurrency safety
 */

import { expect } from 'chai';
import { adminDb } from '@/lib/firebase-admin';
import { 
  enforceTeamQuota, 
  checkTeamQuota, 
  getTeamQuotaStats,
  getQuotaHeadroomPercentage,
  QuotaType 
} from '@/lib/team-quota';

describe('Team Quota System', function () {
  this.timeout(30000);
  
  const testTeamId = 'test_team_quota_wave2';
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

  describe('enforceTeamQuota', function () {
    it('should allow quota usage within limits', async function () {
      const result = await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      
      expect(result.allowed).to.be.true;
      expect(result.quotaType).to.equal('seoAnalyses24h');
      expect(result.used).to.equal(1);
      expect(result.limit).to.equal(25); // starter plan limit
      expect(result.remaining).to.equal(24);
    });

    it('should increment usage correctly on subsequent calls', async function () {
      // First usage
      const result1 = await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      expect(result1.used).to.equal(1);
      expect(result1.remaining).to.equal(24);

      // Second usage
      const result2 = await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      expect(result2.used).to.equal(2);
      expect(result2.remaining).to.equal(23);
    });

    it('should throw error when quota is exceeded', async function () {
      const debugLimit = 2;
      
      // Use up the quota
      await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan, debugLimit);
      await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan, debugLimit);
      
      // Third call should throw
      try {
        await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan, debugLimit);
        expect.fail('Should have thrown quota exceeded error');
      } catch (error: any) {
        expect(error.code).to.equal('resource-exhausted');
        expect(error.httpStatus).to.equal(429);
        expect(error.message).to.include('quota exceeded');
      }
    });

    it('should handle different quota types independently', async function () {
      // Use SEO analysis quota
      const seoResult = await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      expect(seoResult.used).to.equal(1);

      // Use crawler quota (should be independent)
      const crawlerResult = await enforceTeamQuota(testTeamId, 'crawlerRuns24h', testPlan);
      expect(crawlerResult.used).to.equal(1);

      // Check that they don't interfere
      const seoResult2 = await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      expect(seoResult2.used).to.equal(2);
    });

    it('should track rejections when quota exceeded', async function () {
      const debugLimit = 1;
      
      // Use up quota
      await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan, debugLimit);
      
      // Try to exceed (should be rejected)
      try {
        await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan, debugLimit);
      } catch (error) {
        // Expected
      }

      // Check that rejection was recorded
      const stats = await getTeamQuotaStats(testTeamId, testPlan);
      expect(stats).to.not.be.null;
      expect(stats!.totalRejections).to.equal(1);
    });
  });

  describe('checkTeamQuota', function () {
    it('should return correct quota status without incrementing', async function () {
      // First, use some quota
      await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      
      // Check quota status
      const result = await checkTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      
      expect(result.allowed).to.be.true;
      expect(result.used).to.equal(1);
      expect(result.limit).to.equal(25);
      expect(result.remaining).to.equal(24);
      
      // Check again - usage should not have incremented
      const result2 = await checkTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      expect(result2.used).to.equal(1); // Should still be 1
    });

    it('should return false when quota is exceeded', async function () {
      const debugLimit = 1;
      
      // Use up quota
      await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan, debugLimit);
      
      // Check should show quota exceeded
      const result = await checkTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      expect(result.allowed).to.be.false;
      expect(result.used).to.equal(1);
      expect(result.remaining).to.equal(0);
    });

    it('should handle non-existent team gracefully', async function () {
      const result = await checkTeamQuota('', 'seoAnalyses24h', testPlan);
      
      expect(result.allowed).to.be.false;
      expect(result.used).to.equal(0);
      expect(result.limit).to.equal(0);
      expect(result.remaining).to.equal(0);
    });
  });

  describe('getTeamQuotaStats', function () {
    it('should return default stats for new team', async function () {
      const stats = await getTeamQuotaStats('new_team_12345', testPlan);
      
      expect(stats).to.not.be.null;
      expect(stats!.teamId).to.equal('new_team_12345');
      expect(stats!.headroom.seoAnalyses24h).to.equal(100);
      expect(stats!.headroom.crawlerRuns24h).to.equal(100);
      expect(stats!.totalRejections).to.equal(0);
    });

    it('should return accurate stats after usage', async function () {
      // Use some quota
      await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      await enforceTeamQuota(testTeamId, 'crawlerRuns24h', testPlan);
      
      const stats = await getTeamQuotaStats(testTeamId, testPlan);
      
      expect(stats).to.not.be.null;
      expect(stats!.quotas.seoAnalyses24h.used).to.equal(1);
      expect(stats!.quotas.crawlerRuns24h.used).to.equal(1);
      expect(stats!.headroom.seoAnalyses24h).to.equal(96); // (25-1)/25 * 100 = 96%
      expect(stats!.headroom.crawlerRuns24h).to.equal(98); // (50-1)/50 * 100 = 98%
    });
  });

  describe('getQuotaHeadroomPercentage', function () {
    it('should return 100% for unused quota', async function () {
      const headroom = await getQuotaHeadroomPercentage('new_team_unused', 'seoAnalyses24h', testPlan);
      expect(headroom).to.equal(100);
    });

    it('should return correct percentage after usage', async function () {
      // Use some quota
      await enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan);
      
      const headroom = await getQuotaHeadroomPercentage(testTeamId, 'seoAnalyses24h', testPlan);
      expect(headroom).to.equal(96); // (25-1)/25 * 100 = 96%
    });
  });

  describe('concurrency safety', function () {
    it('should handle concurrent quota enforcement safely', async function () {
      const debugLimit = 5;
      const concurrentRequests = 10;
      
      // Create multiple concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        enforceTeamQuota(testTeamId, 'seoAnalyses24h', testPlan, debugLimit).catch(err => err)
      );
      
      const results = await Promise.all(promises);
      
      // Count successful vs failed requests
      const successful = results.filter(r => r.allowed === true).length;
      const failed = results.filter(r => r.code === 'resource-exhausted').length;
      
      expect(successful).to.equal(debugLimit);
      expect(failed).to.equal(concurrentRequests - debugLimit);
      
      // Verify final quota state
      const finalStats = await getTeamQuotaStats(testTeamId, testPlan);
      expect(finalStats!.quotas.seoAnalyses24h.used).to.equal(debugLimit);
      expect(finalStats!.totalRejections).to.equal(failed);
    });
  });
});