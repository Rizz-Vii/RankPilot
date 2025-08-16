#!/usr/bin/env node

/**
 * Simple test runner for semantic-map fallback tests
 * Verifies deterministic behavior without external dependencies
 */

// Simple pseudo-random number generator (PRNG) for deterministic testing
function simplePRNG(seed) {
  let value = seed || 1;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Mock the synthetic utils module
const mockSyntheticUtils = {
  createDeterministicRng: (seedParts) => {
    const seed = seedParts.filter(Boolean).join('::');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return simplePRNG(Math.abs(hash));
  },
  tagSynthetic: (obj) => Object.assign(obj, { __provenance: '__synthetic' }),
  randomInt: (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min,
  randomFloat: (rng, min, max, precision = 2) => {
    const v = rng() * (max - min) + min;
    return Number(v.toFixed(precision));
  }
};

// Simple test framework
let testResults = [];
let currentSuite = '';

function describe(name, fn) {
  currentSuite = name;
  console.log(`\n=== ${name} ===`);
  fn();
}

function test(name, fn) {
  testResults.push({ suite: currentSuite, name, fn });
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected objects to be equal`);
      }
    },
    not: {
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`Expected objects not to be equal`);
        }
      }
    },
    toHaveProperty: (prop, value) => {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
      if (value !== undefined && actual[prop] !== value) {
        throw new Error(`Expected property ${prop} to be ${value}, got ${actual[prop]}`);
      }
    },
    toBeGreaterThanOrEqual: (expected) => {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual: (expected) => {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be > ${expected}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    }
  };
}

// Inline the fallback function for testing (simplified version)
async function generateDeterministicSemanticAnalysis(url, keywords, progressCallback) {
  const sortedKeywords = [...keywords].sort();
  const rng = mockSyntheticUtils.createDeterministicRng([url, sortedKeywords.join(','), 'semantic-map-fallback']);

  if (progressCallback) {
    for (let i = 0; i <= 100; i += 25) {
      progressCallback(i);
      await new Promise(resolve => setTimeout(resolve, 1)); // Fast for tests
    }
  }

  const TOPIC_CATEGORIES = [
    'SEO Strategy', 'Content Marketing', 'Digital Analytics', 'User Experience', 'Technical Optimization'
  ];

  const SAMPLE_KEYWORDS = ['seo', 'optimization', 'content', 'keywords', 'ranking', 'traffic'];

  const clusterCount = Math.min(5, Math.max(3, Math.floor(rng() * 3) + 3));
  const selectedTopics = TOPIC_CATEGORIES.slice(0, clusterCount);

  const topicClusters = selectedTopics.map((topic, index) => {
    const topicRng = mockSyntheticUtils.createDeterministicRng([url, topic, 'cluster']);
    return {
      id: `cluster_${index}`,
      topic,
      keywords: SAMPLE_KEYWORDS.slice(index, index + 2).concat(sortedKeywords.slice(0, 1)),
      semanticScore: mockSyntheticUtils.randomInt(topicRng, 70, 100),
      contentGaps: ['Advanced techniques', 'Case studies'],
      relatedTopics: selectedTopics.filter(t => t !== topic).slice(0, 2),
      searchVolume: mockSyntheticUtils.randomInt(topicRng, 5000, 55000),
      difficulty: mockSyntheticUtils.randomInt(topicRng, 30, 70),
      opportunity: topicRng() > 0.6 ? 'high' : topicRng() > 0.3 ? 'medium' : 'low'
    };
  });

  const keywordAnalysis = sortedKeywords.map(keyword => {
    const keywordRng = mockSyntheticUtils.createDeterministicRng([url, keyword, 'keyword-analysis']);
    return {
      keyword,
      density: mockSyntheticUtils.randomFloat(keywordRng, 0.5, 3.5),
      prominence: mockSyntheticUtils.randomFloat(keywordRng, 0, 100),
      semanticRelevance: mockSyntheticUtils.randomFloat(keywordRng, 60, 100),
      context: ['Main content']
    };
  });

  const contentRng = mockSyntheticUtils.createDeterministicRng([url, 'content-analysis']);
  const contentAnalysis = {
    readabilityScore: mockSyntheticUtils.randomInt(contentRng, 70, 100),
    contentDepth: mockSyntheticUtils.randomInt(contentRng, 60, 100),
    topicCoverage: mockSyntheticUtils.randomInt(contentRng, 70, 100),
    semanticRichness: mockSyntheticUtils.randomInt(contentRng, 60, 100),
    expertiseSignals: mockSyntheticUtils.randomInt(contentRng, 70, 100)
  };

  const graphRng = mockSyntheticUtils.createDeterministicRng([url, 'semantic-graph']);
  const semanticGraph = {
    nodes: selectedTopics.map((topic, index) => ({
      id: `node_${index}`,
      label: topic,
      type: 'topic',
      score: mockSyntheticUtils.randomFloat(graphRng, 60, 100)
    })),
    edges: [
      { source: 'node_0', target: 'node_1', weight: 0.8 },
      { source: 'node_1', target: 'node_2', weight: 0.6 }
    ]
  };

  const recommendations = [
    {
      type: 'content',
      priority: 'high',
      title: 'Expand topic coverage',
      description: 'Add more comprehensive coverage of related semantic topics',
      impact: 'Improved topical authority and search visibility'
    }
  ];

  const scoreRng = mockSyntheticUtils.createDeterministicRng([url, 'overall-score']);
  const baseScore = (contentAnalysis.readabilityScore + contentAnalysis.contentDepth) / 2;
  const overallScore = Math.max(65, Math.min(100, Math.round(baseScore + mockSyntheticUtils.randomInt(scoreRng, -5, 10))));

  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const result = {
    id: `semantic_${simpleHash(url + sortedKeywords.join(','))}`,
    url,
    topicClusters,
    keywordAnalysis,
    contentAnalysis,
    semanticGraph,
    recommendations,
    overallScore,
    createdAt: new Date()
  };

  return mockSyntheticUtils.tagSynthetic(result);
}

// Define tests
describe('Semantic Map Deterministic Fallback', () => {
  test('should generate consistent results for identical inputs', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization', 'content'];
    
    const result1 = await generateDeterministicSemanticAnalysis(url, keywords);
    const result2 = await generateDeterministicSemanticAnalysis(url, keywords);
    
    expect(result1.overallScore).toBe(result2.overallScore);
    expect(result1.topicClusters).toEqual(result2.topicClusters);
    expect(result1.keywordAnalysis).toEqual(result2.keywordAnalysis);
  });

  test('should generate different results for different inputs', async () => {
    const url1 = 'https://example.com/page1';
    const url2 = 'https://example.com/page2';
    const keywords = ['seo', 'optimization'];
    
    const result1 = await generateDeterministicSemanticAnalysis(url1, keywords);
    const result2 = await generateDeterministicSemanticAnalysis(url2, keywords);
    
    expect(result1.overallScore).not.toBe(result2.overallScore);
  });

  test('should be stable across keyword order changes', async () => {
    const url = 'https://example.com/test-page';
    const keywords1 = ['seo', 'optimization', 'content'];
    const keywords2 = ['content', 'seo', 'optimization'];
    
    const result1 = await generateDeterministicSemanticAnalysis(url, keywords1);
    const result2 = await generateDeterministicSemanticAnalysis(url, keywords2);
    
    expect(result1.overallScore).toBe(result2.overallScore);
  });

  test('should include synthetic provenance tag', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    expect(result.__provenance).toBe('__synthetic');
  });

  test('should generate valid structure', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('url', url);
    expect(result).toHaveProperty('topicClusters');
    expect(result).toHaveProperty('keywordAnalysis');
    expect(result).toHaveProperty('contentAnalysis');
    expect(result).toHaveProperty('semanticGraph');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('overallScore');
    
    expect(Array.isArray(result.topicClusters)).toBe(true);
    expect(Array.isArray(result.keywordAnalysis)).toBe(true);
    expect(typeof result.overallScore).toBe('number');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  test('should include target keywords in analysis', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    const analyzedKeywords = result.keywordAnalysis.map(ka => ka.keyword);
    keywords.forEach(keyword => {
      expect(analyzedKeywords).toContain(keyword);
    });
  });

  test('should handle progress callback', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo'];
    const progressValues = [];
    
    await generateDeterministicSemanticAnalysis(url, keywords, (progress) => {
      progressValues.push(progress);
    });
    
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[0]).toBe(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });
});

// Run tests
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const testCase of testResults) {
    try {
      console.log(`  Running: ${testCase.name}`);
      await testCase.fn();
      console.log(`    ✓ PASS`);
      passed++;
    } catch (error) {
      console.log(`    ✗ FAIL: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${testResults.length}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log(`\n🎉 All tests passed!`);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});