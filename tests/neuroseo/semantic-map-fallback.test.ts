/**
 * Unit tests for semantic-map deterministic fallback function
 * Tests deterministic behavior and orchestrator integration
 */

import { generateDeterministicSemanticAnalysis } from '../../../src/lib/neuroseo/semantic-map-fallback';

describe('Semantic Map Deterministic Fallback', () => {
  
  test('should generate consistent results for identical inputs', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization', 'content'];
    
    // Generate results twice with identical inputs
    const result1 = await generateDeterministicSemanticAnalysis(url, keywords);
    const result2 = await generateDeterministicSemanticAnalysis(url, keywords);
    
    // Results should be identical
    expect(result1.overallScore).toBe(result2.overallScore);
    expect(result1.topicClusters).toEqual(result2.topicClusters);
    expect(result1.keywordAnalysis).toEqual(result2.keywordAnalysis);
    expect(result1.contentAnalysis).toEqual(result2.contentAnalysis);
    expect(result1.semanticGraph).toEqual(result2.semanticGraph);
    expect(result1.recommendations).toEqual(result2.recommendations);
  });

  test('should generate different results for different inputs', async () => {
    const url1 = 'https://example.com/page1';
    const url2 = 'https://example.com/page2';
    const keywords = ['seo', 'optimization'];
    
    const result1 = await generateDeterministicSemanticAnalysis(url1, keywords);
    const result2 = await generateDeterministicSemanticAnalysis(url2, keywords);
    
    // Results should be different
    expect(result1.overallScore).not.toBe(result2.overallScore);
    expect(result1.topicClusters).not.toEqual(result2.topicClusters);
  });

  test('should be stable across keyword order changes', async () => {
    const url = 'https://example.com/test-page';
    const keywords1 = ['seo', 'optimization', 'content'];
    const keywords2 = ['content', 'seo', 'optimization']; // Different order
    
    const result1 = await generateDeterministicSemanticAnalysis(url, keywords1);
    const result2 = await generateDeterministicSemanticAnalysis(url, keywords2);
    
    // Results should be identical regardless of keyword order
    expect(result1.overallScore).toBe(result2.overallScore);
    expect(result1.topicClusters).toEqual(result2.topicClusters);
  });

  test('should include synthetic provenance tag', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    expect((result as any).__provenance).toBe('__synthetic');
  });

  test('should generate valid semantic analysis structure', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    // Check structure
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('url', url);
    expect(result).toHaveProperty('topicClusters');
    expect(result).toHaveProperty('keywordAnalysis');
    expect(result).toHaveProperty('contentAnalysis');
    expect(result).toHaveProperty('semanticGraph');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('createdAt');
    
    // Check data types and ranges
    expect(Array.isArray(result.topicClusters)).toBe(true);
    expect(Array.isArray(result.keywordAnalysis)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(typeof result.overallScore).toBe('number');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    
    // Check content analysis scores
    expect(result.contentAnalysis.readabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.contentAnalysis.readabilityScore).toBeLessThanOrEqual(100);
    expect(result.contentAnalysis.contentDepth).toBeGreaterThanOrEqual(0);
    expect(result.contentAnalysis.contentDepth).toBeLessThanOrEqual(100);
  });

  test('should include target keywords in analysis', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization', 'content'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    // Check that all target keywords are included in keyword analysis
    const analyzedKeywords = result.keywordAnalysis.map(ka => ka.keyword);
    keywords.forEach(keyword => {
      expect(analyzedKeywords).toContain(keyword);
    });
  });

  test('should generate realistic metric ranges', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    // Check topic clusters have realistic ranges
    result.topicClusters.forEach(cluster => {
      expect(cluster.semanticScore).toBeGreaterThanOrEqual(70);
      expect(cluster.semanticScore).toBeLessThanOrEqual(100);
      expect(cluster.searchVolume).toBeGreaterThanOrEqual(5000);
      expect(cluster.searchVolume).toBeLessThanOrEqual(55000);
      expect(cluster.difficulty).toBeGreaterThanOrEqual(30);
      expect(cluster.difficulty).toBeLessThanOrEqual(70);
      expect(['high', 'medium', 'low']).toContain(cluster.opportunity);
    });
    
    // Check keyword analysis ranges
    result.keywordAnalysis.forEach(keyword => {
      expect(keyword.density).toBeGreaterThanOrEqual(0.5);
      expect(keyword.density).toBeLessThanOrEqual(3.5);
      expect(keyword.prominence).toBeGreaterThanOrEqual(0);
      expect(keyword.prominence).toBeLessThanOrEqual(100);
      expect(keyword.semanticRelevance).toBeGreaterThanOrEqual(60);
      expect(keyword.semanticRelevance).toBeLessThanOrEqual(100);
    });
  });

  test('should handle progress callback', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo'];
    const progressValues: number[] = [];
    
    await generateDeterministicSemanticAnalysis(url, keywords, (progress) => {
      progressValues.push(progress);
    });
    
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[0]).toBe(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  test('should work without progress callback', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo'];
    
    // Should not throw when no progress callback provided
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    expect(result).toBeDefined();
    expect(result.url).toBe(url);
  });

  test('should generate semantic graph with valid structure', async () => {
    const url = 'https://example.com/test-page';
    const keywords = ['seo', 'optimization'];
    
    const result = await generateDeterministicSemanticAnalysis(url, keywords);
    
    expect(Array.isArray(result.semanticGraph.nodes)).toBe(true);
    expect(Array.isArray(result.semanticGraph.edges)).toBe(true);
    
    // Check node structure
    result.semanticGraph.nodes.forEach(node => {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('label');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('score');
      expect(typeof node.score).toBe('number');
    });
    
    // Check edge structure
    result.semanticGraph.edges.forEach(edge => {
      expect(edge).toHaveProperty('source');
      expect(edge).toHaveProperty('target');
      expect(edge).toHaveProperty('weight');
      expect(typeof edge.weight).toBe('number');
      expect(edge.weight).toBeGreaterThanOrEqual(0);
      expect(edge.weight).toBeLessThanOrEqual(1);
    });
  });
});

// Mock jest environment setup
if (typeof describe === 'undefined') {
  global.describe = (name: string, fn: () => void) => {
    console.log(`\n=== ${name} ===`);
    fn();
  };
  global.test = (name: string, fn: () => void | Promise<void>) => {
    console.log(`  Testing: ${name}`);
    return Promise.resolve(fn()).then(
      () => console.log(`    ✓ PASS`),
      (error) => {
        console.log(`    ✗ FAIL: ${error.message}`);
        throw error;
      }
    );
  };
  global.expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    not: {
      toBe: (expected: any) => {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`);
        }
      }
    },
    toHaveProperty: (prop: string, value?: any) => {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
      if (value !== undefined && actual[prop] !== value) {
        throw new Error(`Expected property ${prop} to be ${value}, got ${actual[prop]}`);
      }
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual: (expected: number) => {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be > ${expected}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toContain: (expected: any) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    }
  });
}

// Export for node.js environment
export { };