/*
  Tests: Aggregate derivation helpers for semantic map & neural crawler (T14)
*/
require('ts-node/register');
const assert = require('assert');
const { deriveSemanticMapAggregate, deriveNeuralCrawlerAggregate } = require('../../../scripts/scan-neuroseo-large-docs.ts');

describe('T14 aggregate derivation', () => {
  it('derives semantic map aggregate with counts/top slices', () => {
    const full = {
      userId: 'u1',
      url: 'https://example.com/a',
      overallScore: 88,
      topicClusters: Array.from({ length: 10 }).map((_, i) => ({ topic: 't'+i, semanticScore: 70+i, opportunity: 'high' })),
      keywordAnalysis: Array.from({ length: 20 }).map((_, i) => ({ keyword: 'k'+i, semanticRelevance: 50+i })),
      contentAnalysis: { readabilityScore: 90, contentDepth: 80, topicCoverage: 85, semanticRichness: 77, expertiseSignals: 82 },
      semanticGraph: { nodes: Array.from({ length: 25 }), edges: Array.from({ length: 40 }) },
      recommendations: Array.from({ length: 12 })
    };
    const agg = deriveSemanticMapAggregate(full);
    assert.equal(agg.userId, 'u1');
    assert.equal(agg.topicClustersCount, 10);
    assert.equal(agg.keywordAnalysisCount, 20);
    assert.ok(agg.topTopicClusters.length <= 5);
    assert.ok(agg.topKeywords.length <= 8);
    assert.equal(agg.graphNodesCount, 25);
    assert.equal(agg.graphEdgesCount, 40);
    assert.equal(agg.recommendationsCount, 12);
  });

  it('derives neural crawler aggregate with counts', () => {
    const full = {
      userId: 'u2',
      url: 'https://example.com/b',
      historyId: 'h1',
      wordCount: 1234,
      readingTime: 345,
      images: [1,2,3],
      links: [{ type: 'internal' }, { type: 'external' }, { type: 'internal' }],
      seoAnalysis: { titleLength: 55, metaDescriptionLength: 150 },
      issues: [1,2,3,4],
      entities: [1,2,3,4,5,6],
      headings: { h1: ['A'], h2: ['B','C'] }
    };
    const agg = deriveNeuralCrawlerAggregate(full);
    assert.equal(agg.userId, 'u2');
    assert.equal(agg.wordCount, 1234);
    assert.equal(agg.imagesCount, 3);
    assert.equal(agg.linksInternal, 2);
    assert.equal(agg.linksExternal, 1);
    assert.equal(agg.issuesCount, 4);
    assert.equal(agg.entitiesCount, 6);
    assert.ok(agg.headings.h1 === 1 && agg.headings.h2 === 2);
  });
});
