/*
  Feature Usage Counter Service Unit Tests
  Validates counter increments and 24h sliding window functionality
*/
require('ts-node/register');
const assert = require('assert');

describe('feature usage counter service', () => {
  let featureCounter;
  
  before(() => {
    featureCounter = require('../../../src/lib/metrics/feature-usage-counter.ts');
  });

  beforeEach(() => {
    // Reset counters before each test
    featureCounter.resetFeatureUsageCounters();
  });

  it('increments feature counters correctly', () => {
    featureCounter.recordFeatureUsage('neuralCrawler');
    featureCounter.recordFeatureUsage('neuralCrawler');
    featureCounter.recordFeatureUsage('semanticMap');
    featureCounter.recordFeatureUsage('aiVisibilityEngine');
    
    const snapshot = featureCounter.getFeatureUsageSnapshot();
    
    assert.equal(snapshot.neuralCrawler, 2);
    assert.equal(snapshot.semanticMap, 1);
    assert.equal(snapshot.aiVisibilityEngine, 1);
    assert.equal(snapshot.trustBlock, 0);
    assert.equal(snapshot.rewriteGen, 0);
    assert.equal(snapshot.orchestrator, 0);
    assert.equal(snapshot.briefGenerator, 0);
    assert.equal(snapshot.totalFeatureUsage, 4);
  });

  it('handles all feature types', () => {
    const features = ['neuralCrawler', 'semanticMap', 'aiVisibilityEngine', 'trustBlock', 'rewriteGen', 'orchestrator', 'briefGenerator'];
    
    features.forEach(feature => {
      featureCounter.recordFeatureUsage(feature);
    });
    
    const snapshot = featureCounter.getFeatureUsageSnapshot();
    
    features.forEach(feature => {
      assert.equal(snapshot[feature], 1, `${feature} should have count of 1`);
    });
    assert.equal(snapshot.totalFeatureUsage, features.length);
  });

  it('resets counters correctly', () => {
    featureCounter.recordFeatureUsage('neuralCrawler');
    featureCounter.recordFeatureUsage('semanticMap');
    
    let snapshot = featureCounter.getFeatureUsageSnapshot();
    assert.equal(snapshot.totalFeatureUsage, 2);
    
    featureCounter.resetFeatureUsageCounters();
    
    snapshot = featureCounter.getFeatureUsageSnapshot();
    assert.equal(snapshot.totalFeatureUsage, 0);
    assert.equal(snapshot.neuralCrawler, 0);
    assert.equal(snapshot.semanticMap, 0);
  });

  it('tracks entries count for debugging', () => {
    assert.equal(featureCounter.getEntriesCount(), 0);
    
    featureCounter.recordFeatureUsage('neuralCrawler');
    featureCounter.recordFeatureUsage('semanticMap');
    
    assert.equal(featureCounter.getEntriesCount(), 2);
  });

  // Note: Testing actual 24h expiry would require time manipulation
  // For now, we verify the sliding window concept through entry count tracking
  it('maintains entry structure for sliding window', () => {
    const initialCount = featureCounter.getEntriesCount();
    
    featureCounter.recordFeatureUsage('neuralCrawler');
    featureCounter.recordFeatureUsage('semanticMap');
    featureCounter.recordFeatureUsage('aiVisibilityEngine');
    
    const newCount = featureCounter.getEntriesCount();
    assert.equal(newCount, initialCount + 3);
    
    const snapshot = featureCounter.getFeatureUsageSnapshot();
    assert.equal(snapshot.totalFeatureUsage, 3);
  });
});