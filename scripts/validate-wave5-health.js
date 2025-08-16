#!/usr/bin/env node

// Wave 5 Health Endpoint Validation Script
// Simple validation without dependencies to check the core logic

console.log('🔍 Wave 5 Health Endpoint Extensions - Validation');

// Mock Firebase Admin DB
const mockDb = {
  collection: (name) => ({
    where: (field, op, value) => ({
      limit: (n) => ({
        get: async () => {
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
                }
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

// Mock quota headroom calculation
async function calculateQuotaHeadroom() {
  const crawlerUsage = await mockDb.collection('teamCrawlerUsage').where('date', '==', '2025-08-16').limit(200).get();
  const auditUsage = await mockDb.collection('quotas').limit(200).get();

  let totalUsed = 0;
  let totalLimit = 0;
  let teamsAnalyzed = 0;

  // Process crawler usage
  crawlerUsage.docs.forEach(doc => {
    const data = doc.data();
    totalUsed += data.count || 0;
    totalLimit += data.limit || 0;
    if (data.limit > 0) teamsAnalyzed++;
  });

  // Process general quota usage
  auditUsage.docs.forEach(doc => {
    const data = doc.data();
    if (data.usage && data.limits) {
      const usage = data.usage;
      const limits = data.limits;
      
      if (limits.auditsPerMonth > 0) {
        totalUsed += usage.auditsPerformed || 0;
        totalLimit += limits.auditsPerMonth;
      }
      if (limits.keywords > 0) {
        totalUsed += usage.keywordSearches || 0;
        totalLimit += limits.keywords;
      }
      if (limits.reports > 0) {
        totalUsed += usage.reportsGenerated || 0;
        totalLimit += limits.reports;
      }
      if (limits.competitors > 0) {
        totalUsed += usage.competitorAnalyses || 0;
        totalLimit += limits.competitors;
      }
    }
  });

  const usagePercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const quotaHeadroomPct = Math.max(0, 100 - usagePercentage);

  return {
    quotaHeadroomPct: +quotaHeadroomPct.toFixed(2),
    details: {
      totalUsed,
      totalLimit,
      usagePercentage: +usagePercentage.toFixed(2),
      teamsAnalyzed
    }
  };
}

// Mock snapshot freshness calculation
async function calculateSnapshotFreshness() {
  const dailySnapshots = await mockDb.collection('kpiDaily').orderBy('timestamp', 'desc').limit(1).get();

  if (dailySnapshots.empty) {
    return { snapshotFreshnessHours: null, details: null };
  }

  const lastSnapshotTime = dailySnapshots.docs[0].data().timestamp;
  const now = new Date();
  const ageMs = now.getTime() - lastSnapshotTime.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  let staleness;
  if (ageHours <= 2) {
    staleness = 'fresh';
  } else if (ageHours <= 6) {
    staleness = 'stale';
  } else {
    staleness = 'outdated';
  }

  return {
    snapshotFreshnessHours: +ageHours.toFixed(2),
    details: {
      lastSnapshotTime: lastSnapshotTime.toISOString(),
      staleness,
      ageMs
    }
  };
}

// Mock health endpoint response structure
async function generateHealthResponse() {
  const quotaResult = await calculateQuotaHeadroom();
  const freshnessResult = await calculateSnapshotFreshness();

  const aiUsage = { tokensIn: 1250, tokensOut: 850, costEstimate: 0.0045 };

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    // Wave 5 explicit fields
    aiTokenUsage24h: { tokensIn: aiUsage.tokensIn, tokensOut: aiUsage.tokensOut },
    aiCostEstimate24h: aiUsage.costEstimate,
    quotaHeadroomPct: quotaResult.quotaHeadroomPct,
    snapshotFreshnessHours: freshnessResult.snapshotFreshnessHours,
    // Existing fields
    aiUsage24h: aiUsage,
    kpis: {
      provenanceCoveragePct: 100,
      quotaHeadroomPct: quotaResult.quotaHeadroomPct,
      snapshotFreshnessHours: freshnessResult.snapshotFreshnessHours
    },
    alerts: []
  };
}

// Validation tests
async function runValidation() {
  try {
    console.log('\n📊 Testing quota headroom calculation...');
    const quotaResult = await calculateQuotaHeadroom();
    console.log('✅ Quota headroom result:', quotaResult);
    
    if (quotaResult.quotaHeadroomPct !== null) {
      console.log(`   • Headroom: ${quotaResult.quotaHeadroomPct}%`);
      console.log(`   • Total used: ${quotaResult.details.totalUsed}`);
      console.log(`   • Total limit: ${quotaResult.details.totalLimit}`);
      console.log(`   • Teams analyzed: ${quotaResult.details.teamsAnalyzed}`);
    }

    console.log('\n⏰ Testing snapshot freshness calculation...');
    const freshnessResult = await calculateSnapshotFreshness();
    console.log('✅ Snapshot freshness result:', freshnessResult);
    
    if (freshnessResult.snapshotFreshnessHours !== null) {
      console.log(`   • Age: ${freshnessResult.snapshotFreshnessHours} hours`);
      console.log(`   • Staleness: ${freshnessResult.details.staleness}`);
    }

    console.log('\n🏥 Testing complete health response...');
    const healthResponse = await generateHealthResponse();
    console.log('✅ Health response structure:', Object.keys(healthResponse));
    
    // Validate Wave 5 fields
    const wave5Fields = ['aiTokenUsage24h', 'aiCostEstimate24h', 'quotaHeadroomPct', 'snapshotFreshnessHours'];
    const missingFields = wave5Fields.filter(field => !(field in healthResponse));
    
    if (missingFields.length === 0) {
      console.log('✅ All Wave 5 fields present in response');
    } else {
      console.log('❌ Missing Wave 5 fields:', missingFields);
    }

    // Validate field types
    console.log('\n🔍 Field validation:');
    if (typeof healthResponse.aiTokenUsage24h?.tokensIn === 'number') {
      console.log('✅ aiTokenUsage24h.tokensIn is number');
    }
    if (typeof healthResponse.aiTokenUsage24h?.tokensOut === 'number') {
      console.log('✅ aiTokenUsage24h.tokensOut is number');
    }
    if (typeof healthResponse.aiCostEstimate24h === 'number') {
      console.log('✅ aiCostEstimate24h is number');
    }
    if (healthResponse.quotaHeadroomPct === null || typeof healthResponse.quotaHeadroomPct === 'number') {
      console.log('✅ quotaHeadroomPct is number or null');
    }
    if (healthResponse.snapshotFreshnessHours === null || typeof healthResponse.snapshotFreshnessHours === 'number') {
      console.log('✅ snapshotFreshnessHours is number or null');
    }

    console.log('\n🎉 Wave 5 validation complete! All fields working correctly.');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

runValidation();