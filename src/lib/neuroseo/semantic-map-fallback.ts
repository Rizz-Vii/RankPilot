/**
 * Deterministic Fallback for Semantic Map Analysis
 * 
 * This module provides a seed-stable fallback function that generates
 * consistent simulated semantic analysis results when the orchestrator
 * is unavailable. Identical inputs will always produce identical outputs.
 */

import { createDeterministicRng, randomInt, randomFloat, tagSynthetic } from '@/lib/synthetic/synthetic-utils';

export interface SemanticMapResult {
  id: string;
  url: string;
  topicClusters: TopicCluster[];
  keywordAnalysis: KeywordAnalysis[];
  contentAnalysis: ContentAnalysis;
  semanticGraph: {
    nodes: Array<{ id: string; label: string; type: string; score: number }>;
    edges: Array<{ source: string; target: string; weight: number }>;
  };
  recommendations: Array<{
    type: 'content' | 'keyword' | 'structure' | 'semantic';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }>;
  overallScore: number;
  createdAt: Date;
}

export interface TopicCluster {
  id: string;
  topic: string;
  keywords: string[];
  semanticScore: number;
  contentGaps: string[];
  relatedTopics: string[];
  searchVolume: number;
  difficulty: number;
  opportunity: 'high' | 'medium' | 'low';
}

export interface KeywordAnalysis {
  keyword: string;
  density: number;
  prominence: number;
  semanticRelevance: number;
  context: string[];
}

export interface ContentAnalysis {
  readabilityScore: number;
  contentDepth: number;
  topicCoverage: number;
  semanticRichness: number;
  expertiseSignals: number;
}

/**
 * Deterministic fallback function for semantic analysis
 * Uses stable seeding to ensure identical inputs produce identical outputs
 * 
 * @param url - Target URL for analysis
 * @param keywords - Array of target keywords
 * @param progressCallback - Optional callback for progress updates
 * @returns Promise<SemanticMapResult> - Deterministic semantic analysis result
 */
export async function generateDeterministicSemanticAnalysis(
  url: string,
  keywords: string[],
  progressCallback?: (progress: number) => void
): Promise<SemanticMapResult> {
  // Create deterministic RNG based on sorted inputs for consistency
  const sortedKeywords = [...keywords].sort();
  const rng = createDeterministicRng([url, sortedKeywords.join(','), 'semantic-map-fallback']);

  // Simulate progressive analysis if callback provided
  if (progressCallback) {
    for (let i = 0; i <= 100; i += 12) {
      progressCallback(i);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  // Pre-defined topic categories for consistency
  const TOPIC_CATEGORIES = [
    'SEO Strategy', 
    'Content Marketing', 
    'Digital Analytics', 
    'User Experience', 
    'Technical Optimization',
    'Link Building',
    'Keyword Research',
    'Content Creation',
    'Performance Monitoring',
    'Competitive Analysis'
  ];

  // Pre-defined sample keywords for consistency
  const SAMPLE_KEYWORDS = [
    'seo', 'optimization', 'content', 'keywords', 'ranking', 'traffic', 
    'conversion', 'analytics', 'performance', 'strategy', 'marketing',
    'search', 'visibility', 'engagement', 'authority', 'quality'
  ];

  // Generate deterministic topic clusters
  const clusterCount = Math.min(5, Math.max(3, Math.floor(rng() * 3) + 3));
  const selectedTopics = TOPIC_CATEGORIES
    .sort((a, b) => {
      // Use deterministic sorting based on URL + topic
      const hashA = simpleHash(url + a);
      const hashB = simpleHash(url + b);
      return hashA - hashB;
    })
    .slice(0, clusterCount);

  const topicClusters: TopicCluster[] = selectedTopics.map((topic, index) => {
    const topicRng = createDeterministicRng([url, topic, 'cluster']);
    
    // Select keywords for this cluster deterministically
    const clusterKeywords = SAMPLE_KEYWORDS
      .filter(() => topicRng() > 0.6) // ~40% selection chance
      .slice(0, 3)
      .concat(sortedKeywords.slice(index, index + 2)); // Include some target keywords

    const pickOpportunity = (): 'high' | 'medium' | 'low' => {
      const r = topicRng();
      if (r > 0.6) return 'high';
      if (r > 0.3) return 'medium';
      return 'low';
    };

    return {
      id: `cluster_${index}`,
      topic,
      keywords: [...new Set(clusterKeywords)], // Remove duplicates
      semanticScore: randomInt(topicRng, 70, 100),
      contentGaps: ['Advanced techniques', 'Case studies', 'ROI measurement'],
      relatedTopics: selectedTopics.filter(t => t !== topic).slice(0, 2),
      searchVolume: randomInt(topicRng, 5000, 55000),
      difficulty: randomInt(topicRng, 30, 70),
      opportunity: pickOpportunity()
    };
  });

  // Generate deterministic keyword analysis
  const keywordAnalysis: KeywordAnalysis[] = sortedKeywords.map(keyword => {
    const keywordRng = createDeterministicRng([url, keyword, 'keyword-analysis']);
    const contextOptions = ['Main content', 'Headings', 'Meta tags', 'Alt text', 'URLs'];
    const selectedContexts = contextOptions.filter(() => keywordRng() > 0.5).slice(0, 3);

    return {
      keyword,
      density: randomFloat(keywordRng, 0.5, 3.5),
      prominence: randomFloat(keywordRng, 0, 100),
      semanticRelevance: randomFloat(keywordRng, 60, 100),
      context: selectedContexts.length > 0 ? selectedContexts : ['Main content']
    };
  });

  // Generate deterministic content analysis
  const contentRng = createDeterministicRng([url, 'content-analysis']);
  const contentAnalysis: ContentAnalysis = {
    readabilityScore: randomInt(contentRng, 70, 100),
    contentDepth: randomInt(contentRng, 60, 100),
    topicCoverage: randomInt(contentRng, 70, 100),
    semanticRichness: randomInt(contentRng, 60, 100),
    expertiseSignals: randomInt(contentRng, 70, 100)
  };

  // Generate deterministic semantic graph
  const graphRng = createDeterministicRng([url, 'semantic-graph']);
  const semanticGraph = {
    nodes: selectedTopics.map((topic, index) => ({
      id: `node_${index}`,
      label: topic,
      type: 'topic',
      score: randomFloat(graphRng, 60, 100)
    })),
    edges: generateDeterministicEdges(selectedTopics.length, graphRng)
  };

  // Generate deterministic recommendations
  const recommendationTypes: Array<'content' | 'keyword' | 'structure' | 'semantic'> = 
    ['content', 'keyword', 'semantic'];
  const recommendations = recommendationTypes.map(type => {
    const recRng = createDeterministicRng([url, type, 'recommendation']);
    const priority: 'high' | 'medium' | 'low' = recRng() > 0.6 ? 'high' : recRng() > 0.3 ? 'medium' : 'low';
    
    const recommendationMap = {
      content: {
        title: 'Expand topic coverage',
        description: 'Add more comprehensive coverage of related semantic topics',
        impact: 'Improved topical authority and search visibility'
      },
      keyword: {
        title: 'Optimize keyword density',
        description: 'Balance primary keyword usage throughout the content',
        impact: 'Better keyword relevance signals'
      },
      semantic: {
        title: 'Strengthen semantic connections',
        description: 'Add more related terms and concepts to improve semantic richness',
        impact: 'Enhanced understanding by search engines'
      },
      structure: {
        title: 'Improve content structure',
        description: 'Optimize heading hierarchy and content organization',
        impact: 'Better content readability and SEO performance'
      }
    };

    return {
      type,
      priority,
      ...recommendationMap[type]
    };
  });

  // Calculate deterministic overall score
  const scoreRng = createDeterministicRng([url, 'overall-score']);
  const baseScore = (
    contentAnalysis.readabilityScore * 0.2 +
    contentAnalysis.contentDepth * 0.25 +
    contentAnalysis.topicCoverage * 0.25 +
    contentAnalysis.semanticRichness * 0.15 +
    contentAnalysis.expertiseSignals * 0.15
  );
  const overallScore = Math.max(65, Math.min(100, Math.round(baseScore + randomInt(scoreRng, -5, 10))));

  const result: SemanticMapResult = {
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

  return tagSynthetic(result);
}

/**
 * Generate deterministic edges for semantic graph
 */
function generateDeterministicEdges(nodeCount: number, rng: () => number): Array<{ source: string; target: string; weight: number }> {
  const edges: Array<{ source: string; target: string; weight: number }> = [];
  
  for (let i = 0; i < nodeCount - 1; i++) {
    // Create a ring structure first
    edges.push({
      source: `node_${i}`,
      target: `node_${(i + 1) % nodeCount}`,
      weight: randomFloat(rng, 0.6, 0.9, 1)
    });
  }

  // Add some cross connections deterministically
  const maxCrossConnections = Math.floor(nodeCount / 2);
  for (let i = 0; i < maxCrossConnections; i++) {
    if (rng() > 0.5) {
      const source = i;
      const target = (i + 2) % nodeCount;
      if (source !== target) {
        edges.push({
          source: `node_${source}`,
          target: `node_${target}`,
          weight: randomFloat(rng, 0.3, 0.7, 1)
        });
      }
    }
  }

  return edges;
}

/**
 * Simple deterministic hash function for consistent sorting
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}