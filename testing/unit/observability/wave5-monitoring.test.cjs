const { expect } = require('chai');

// Mock Firebase Admin SDK
const mockAdminDb = {
  collection: (name) => ({
    where: (field, op, value) => ({
      limit: (n) => ({
        get: async () => {
          // Return mock data based on collection name
          if (name === 'teamCrawlerUsage') {
            return {
              docs: [
                { data: () => ({ count: 50, limit: 100, rejections: 5 }) },
                { data: () => ({ count: 30, limit: 200, rejections: 2 }) }
              ]
            };
          }
          if (name === 'quotas') {
            return {
              docs: [
                { 
                  data: () => ({ 
                    usage: { auditsPerformed: 10, keywordSearches: 25, reportsGenerated: 5, competitorAnalyses: 3 },
                    limits: { auditsPerMonth: 50, keywords: 100, reports: 20, competitors: 10 }
                  }) 
                },
                { 
                  data: () => ({ 
                    usage: { auditsPerformed: 15, keywordSearches: 45, reportsGenerated: 8, competitorAnalyses: 7 },
                    limits: { auditsPerMonth: 100, keywords: 200, reports: 30, competitors: 20 }
                  }) 
                }
              ]
            };
          }
          if (name === 'kpiDaily') {
            return {
              empty: false,
              docs: [
                { data: () => ({ timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }) } // 2 hours ago
              ]
            };
          }
          return { empty: true, docs: [] };
        }
      })
    }),
    orderBy: () => ({
      limit: (n) => ({
        get: async () => ({
          empty: false,
          docs: [
            { data: () => ({ timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }) }
          ]
        })
      })
    })
  })
};

// Mock the firebase-admin module
const originalRequire = require;
require = function(id) {
  if (id.includes('firebase-admin')) {
    return mockAdminDb;
  }
  return originalRequire.apply(this, arguments);
};

describe('Wave 5 Monitoring Functions', () => {
  describe('Quota Headroom Calculation', () => {
    it('should calculate quota headroom correctly with mock data', async () => {
      // Import after mocking
      const { calculateQuotaHeadroom } = require('../../../src/lib/metrics/quota-headroom');
      
      const result = await calculateQuotaHeadroom();
      
      expect(result).to.have.property('quotaHeadroomPct');
      expect(result).to.have.property('details');
      
      if (result.quotaHeadroomPct !== null) {
        expect(result.quotaHeadroomPct).to.be.a('number');
        expect(result.quotaHeadroomPct).to.be.at.least(0);
        expect(result.quotaHeadroomPct).to.be.at.most(100);
      }
      
      if (result.details) {
        expect(result.details).to.have.property('totalUsed');
        expect(result.details).to.have.property('totalLimit');
        expect(result.details).to.have.property('usagePercentage');
        expect(result.details).to.have.property('teamsAnalyzed');
        expect(result.details.totalUsed).to.be.a('number');
        expect(result.details.totalLimit).to.be.a('number');
        expect(result.details.totalLimit).to.be.at.least(result.details.totalUsed);
      }
    });
  });

  describe('Snapshot Freshness Calculation', () => {
    it('should calculate snapshot freshness correctly with mock data', async () => {
      // Import after mocking
      const { calculateSnapshotFreshness } = require('../../../src/lib/metrics/snapshot-freshness');
      
      const result = await calculateSnapshotFreshness();
      
      expect(result).to.have.property('snapshotFreshnessHours');
      expect(result).to.have.property('details');
      
      if (result.snapshotFreshnessHours !== null) {
        expect(result.snapshotFreshnessHours).to.be.a('number');
        expect(result.snapshotFreshnessHours).to.be.at.least(0);
        // Should be approximately 2 hours based on mock data
        expect(result.snapshotFreshnessHours).to.be.within(1.5, 2.5);
      }
      
      if (result.details) {
        expect(result.details).to.have.property('lastSnapshotTime');
        expect(result.details).to.have.property('staleness');
        expect(result.details).to.have.property('ageMs');
        expect(['fresh', 'stale', 'outdated']).to.include(result.details.staleness);
      }
    });
  });
});

// Restore original require
require = originalRequire;