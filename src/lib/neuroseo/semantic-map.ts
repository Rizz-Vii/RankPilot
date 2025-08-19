/**
 * SemanticMap™ - Advanced NLP analysis and topic visualization
 * Part of the NeuroSEO™ Suite for RankPilot
 */

export interface TopicCluster {
  id: string;
  name: string;
  keywords: string[];
  relevanceScore: number;
  coverage: number;
  subTopics: SubTopic[];
}

export interface SubTopic {
  name: string;
  keywords: string[];
  coverage: number;
  missing: boolean;
}

export interface ContentGap {
  topic: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedKeywords: string[];
  competitorCoverage: number;
}

export interface SemanticFingerprint {
  topicClusters: TopicCluster[];
  contentGaps: ContentGap[];
  semanticDensity: number;
  topicalAuthority: number;
  entityCoverage: {
    [entity: string]: {
      mentions: number;
      contexts: string[];
      sentiment: "positive" | "neutral" | "negative";
    };
  };
}

export interface SemanticAnalysisResult {
  fingerprint: SemanticFingerprint;
  recommendations: SemanticRecommendation[];
  competitiveInsights: CompetitiveInsight[];
  visualizationData: VisualizationData;
  /** Composite semantic relevance score (0-100) derived from density, topical authority, entity coverage. */
  overallRelevanceScore: number;
}

export interface SemanticRecommendation {
  type:
  | "topic_expansion"
  | "keyword_optimization"
  | "entity_enhancement"
  | "content_depth";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: number;
  implementation: string;
}

export interface CompetitiveInsight {
  competitorUrl: string;
  advantage: string;
  gap: string;
  actionable: string;
}

export interface VisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    type: "topic" | "keyword" | "entity";
    size: number;
    color: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    type: "semantic" | "contextual" | "hierarchical";
  }>;
}

// Design token usage (replaced prior hardcoded legacy slate hex)
const SEMANTIC_EDGE_COLOR = 'var(--color-slate-400)';

export class SemanticMap {
  async analyzeContent(
    content: string,
    _title: string,
    targetKeywords: string[] = [],
    competitorData?: Array<{ url: string; content: string }>
  ): Promise<SemanticAnalysisResult> {
    // Extract topic clusters
    const topicClusters = await this.extractTopicClusters(
      content,
      targetKeywords
    );

    // Identify content gaps
    const contentGaps = await this.identifyContentGaps(
      topicClusters,
      competitorData
    );

    // Calculate semantic metrics
    const semanticDensity = this.calculateSemanticDensity(
      content,
      targetKeywords
    );
    const topicalAuthority = this.calculateTopicalAuthority(topicClusters);

    // Extract entity coverage
    const entityCoverage = await this.extractEntityCoverage(content);

    // Create semantic fingerprint
    const fingerprint: SemanticFingerprint = {
      topicClusters,
      contentGaps,
      semanticDensity,
      topicalAuthority,
      entityCoverage,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(fingerprint);

    // Generate competitive insights
    const competitiveInsights = competitorData
      ? await this.generateCompetitiveInsights(fingerprint, competitorData)
      : [];

    // Create visualization data
    const visualizationData = this.createVisualizationData(fingerprint);

    return {
      fingerprint,
      recommendations,
      competitiveInsights,
      visualizationData,
      overallRelevanceScore: this.computeOverallRelevance(fingerprint),
    };
  }

  private computeOverallRelevance(f: SemanticFingerprint): number {
    // Heuristic: 40% topicalAuthority, 35% semanticDensity, 25% entity richness
    const entityRichness = Object.keys(f.entityCoverage).length;
    const entityScore = Math.min(100, entityRichness * 6); // 0..100 scaled
    const score = f.topicalAuthority * 0.4 + f.semanticDensity * 0.35 + entityScore * 0.25;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private async extractTopicClusters(
    content: string,
    targetKeywords: string[]
  ): Promise<TopicCluster[]> {
    // Simplified topic clustering (would use advanced NLP/embeddings in production)
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const words = content.toLowerCase().split(/\s+/);

    // Define topic areas based on keyword analysis
    const topicAreas = [
      {
        name: "Core Product/Service",
        keywords: this.extractProductKeywords(words),
        id: "core-product",
      },
      {
        name: "Features & Benefits",
        keywords: this.extractFeatureKeywords(words),
        id: "features",
      },
      {
        name: "Technical Specifications",
        keywords: this.extractTechnicalKeywords(words),
        id: "technical",
      },
      {
        name: "Use Cases & Applications",
        keywords: this.extractUseCaseKeywords(words),
        id: "use-cases",
      },
    ];

    return topicAreas.map((area) => {
      const coverage = this.calculateTopicCoverage(area.keywords, words);
      const subTopics = this.extractSubTopics(area.keywords, sentences);

      return {
        id: area.id,
        name: area.name,
        keywords: area.keywords,
        relevanceScore: this.calculateRelevanceScore(
          area.keywords,
          targetKeywords
        ),
        coverage,
        subTopics,
      };
    });
  }

  private extractProductKeywords(words: string[]): string[] {
    const productIndicators = [
      "product",
      "service",
      "solution",
      "platform",
      "tool",
      "software",
      "app",
    ];
    return this.findRelatedTerms(words, productIndicators);
  }

  private extractFeatureKeywords(words: string[]): string[] {
    const featureIndicators = [
      "feature",
      "benefit",
      "advantage",
      "capability",
      "function",
      "includes",
    ];
    return this.findRelatedTerms(words, featureIndicators);
  }

  private extractTechnicalKeywords(words: string[]): string[] {
    const technicalIndicators = [
      "api",
      "integration",
      "specification",
      "requirements",
      "technology",
      "system",
    ];
    return this.findRelatedTerms(words, technicalIndicators);
  }

  private extractUseCaseKeywords(words: string[]): string[] {
    const useCaseIndicators = [
      "use case",
      "application",
      "example",
      "scenario",
      "implementation",
      "workflow",
    ];
    return this.findRelatedTerms(words, useCaseIndicators);
  }

  private findRelatedTerms(words: string[], indicators: string[]): string[] {
    const related: string[] = [];

    words.forEach((word, index) => {
      if (indicators.some((indicator) => word.includes(indicator))) {
        // Add surrounding words as context
        const start = Math.max(0, index - 2);
        const end = Math.min(words.length, index + 3);
        const context = words.slice(start, end);
        related.push(...context.filter((w) => w.length > 3));
      }
    });

    return [...new Set(related)].slice(0, 10);
  }

  private calculateTopicCoverage(keywords: string[], words: string[]): number {
    if (keywords.length === 0) return 0;

    const mentions = keywords.reduce(
      (count, keyword) =>
        count +
        words.filter((word) => word.includes(keyword.toLowerCase())).length,
      0
    );

    return Math.min(100, (mentions / keywords.length) * 10);
  }

  private extractSubTopics(
    keywords: string[],
    sentences: string[]
  ): SubTopic[] {
    // Group keywords into subtopics based on co-occurrence
    const subTopicGroups = this.groupRelatedKeywords(keywords, sentences);

    return subTopicGroups.map((group) => ({
      name: group.name,
      keywords: group.keywords,
      coverage: this.calculateSubTopicCoverage(group.keywords, sentences),
      missing: group.coverage < 0.3,
    }));
  }

  private groupRelatedKeywords(
    keywords: string[],
    sentences: string[]
  ): Array<{
    name: string;
    keywords: string[];
    coverage: number;
  }> {
    // Simplified keyword grouping (would use semantic similarity in production)
    const groups: Array<{
      name: string;
      keywords: string[];
      coverage: number;
    }> = [];
    const processed = new Set<string>();

    keywords.forEach((keyword) => {
      if (processed.has(keyword)) return;

      const relatedKeywords = keywords.filter(
        (k) =>
          !processed.has(k) && this.areKeywordsRelated(keyword, k, sentences)
      );

      if (relatedKeywords.length > 0) {
        relatedKeywords.forEach((k) => processed.add(k));

        groups.push({
          name: this.generateSubTopicName(relatedKeywords),
          keywords: relatedKeywords,
          coverage: this.calculateSubTopicCoverage(relatedKeywords, sentences),
        });
      }
    });

    return groups;
  }

  private areKeywordsRelated(
    keyword1: string,
    keyword2: string,
    sentences: string[]
  ): boolean {
    // Check if keywords appear in the same sentences
    let coOccurrence = 0;
    sentences.forEach((sentence) => {
      const lowerSentence = sentence.toLowerCase();
      if (
        lowerSentence.includes(keyword1) &&
        lowerSentence.includes(keyword2)
      ) {
        coOccurrence++;
      }
    });

    return coOccurrence > 0;
  }

  private generateSubTopicName(keywords: string[]): string {
    // Generate a name based on the most significant keyword
    const sortedKeywords = keywords.sort((a, b) => b.length - a.length);
    return (
      sortedKeywords[0]?.charAt(0).toUpperCase() +
      sortedKeywords[0]?.slice(1) || "Subtopic"
    );
  }

  private calculateSubTopicCoverage(
    keywords: string[],
    sentences: string[]
  ): number {
    const mentionedKeywords = keywords.filter((keyword) =>
      sentences.some((sentence) => sentence.toLowerCase().includes(keyword))
    );

    return keywords.length > 0 ? mentionedKeywords.length / keywords.length : 0;
  }

  private calculateRelevanceScore(
    keywords: string[],
    targetKeywords: string[]
  ): number {
    if (targetKeywords.length === 0) return 50;

    const relevantKeywords = keywords.filter((keyword) =>
      targetKeywords.some(
        (target) =>
          keyword.toLowerCase().includes(target.toLowerCase()) ||
          target.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    return Math.min(
      100,
      (relevantKeywords.length / targetKeywords.length) * 100
    );
  }

  private async identifyContentGaps(
    topicClusters: TopicCluster[],
    competitorData?: Array<{ url: string; content: string }>
  ): Promise<ContentGap[]> {
    const gaps: ContentGap[] = [];

    // Identify gaps based on low coverage topics
    topicClusters.forEach((cluster) => {
      if (cluster.coverage < 30) {
        gaps.push({
          topic: cluster.name,
          description: `Low coverage detected for ${cluster.name}. Consider expanding content in this area.`,
          priority: cluster.relevanceScore > 70 ? "high" : "medium",
          suggestedKeywords: cluster.keywords.slice(0, 5),
          competitorCoverage: competitorData
            ? this.calculateCompetitorCoverage(cluster, competitorData)
            : 0,
        });
      }
    });

    // Add gaps for missing essential topics
    const essentialTopics = [
      "Overview",
      "Getting Started",
      "Advanced Features",
      "FAQ",
    ];
    const coveredTopics = topicClusters.map((c) => c.name);

    essentialTopics.forEach((topic) => {
      if (
        !coveredTopics.some((covered) =>
          covered.toLowerCase().includes(topic.toLowerCase())
        )
      ) {
        gaps.push({
          topic,
          description: `Missing essential topic: ${topic}`,
          priority: "medium",
          suggestedKeywords: this.generateSuggestedKeywords(topic),
          competitorCoverage: 0,
        });
      }
    });

    return gaps;
  }

  private calculateCompetitorCoverage(
    cluster: TopicCluster,
    competitorData: Array<{ url: string; content: string }>
  ): number {
    if (competitorData.length === 0) return 0;

    const coverageScores = competitorData.map((competitor) => {
      const competitorWords = competitor.content.toLowerCase().split(/\s+/);
      return this.calculateTopicCoverage(cluster.keywords, competitorWords);
    });

    return (
      coverageScores.reduce((sum, score) => sum + score, 0) /
      coverageScores.length
    );
  }

  private generateSuggestedKeywords(topic: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      Overview: ["introduction", "overview", "summary", "description"],
      "Getting Started": [
        "tutorial",
        "guide",
        "setup",
        "installation",
        "quickstart",
      ],
      "Advanced Features": ["advanced", "expert", "professional", "enterprise"],
      FAQ: ["questions", "answers", "help", "support", "troubleshooting"],
    };

    return keywordMap[topic] || [topic.toLowerCase().replace(/\s+/g, "-")];
  }

  private calculateSemanticDensity(
    content: string,
    targetKeywords: string[]
  ): number {
    if (targetKeywords.length === 0) return 0;

    const words = content.toLowerCase().split(/\s+/);
    const totalMentions = targetKeywords.reduce(
      (count, keyword) =>
        count +
        words.filter((word) => word.includes(keyword.toLowerCase())).length,
      0
    );

    return Math.min(100, (totalMentions / words.length) * 1000); // Percentage * 10
  }

  private calculateTopicalAuthority(topicClusters: TopicCluster[]): number {
    if (topicClusters.length === 0) return 0;

    const averageCoverage =
      topicClusters.reduce((sum, cluster) => sum + cluster.coverage, 0) /
      topicClusters.length;
    const averageRelevance =
      topicClusters.reduce((sum, cluster) => sum + cluster.relevanceScore, 0) /
      topicClusters.length;

    return Math.round((averageCoverage + averageRelevance) / 2);
  }

  private async extractEntityCoverage(content: string) {
    // Simplified entity extraction (would use NER in production)
    const entities: {
      [entity: string]: {
        mentions: number;
        contexts: string[];
        sentiment: "positive" | "neutral" | "negative";
      };
    } = {};

    const sentences = content.split(/[.!?]+/);
    const words = content.split(/\s+/);

    // Look for entities (capitalized words, brands, etc.)
    const potentialEntities = words.filter(
      (word) => /^[A-Z][a-zA-Z]{2,}/.test(word) && word.length > 2
    );

    const uniqueEntities = [...new Set(potentialEntities)];

    uniqueEntities.forEach((entity) => {
      const mentions = words.filter((word) => word === entity).length;
      const contexts = sentences
        .filter((sentence) => sentence.includes(entity))
        .slice(0, 3);

      entities[entity] = {
        mentions,
        contexts,
        sentiment: this.analyzeSentiment(contexts),
      };
    });

    return entities;
  }

  private analyzeSentiment(
    contexts: string[]
  ): "positive" | "neutral" | "negative" {
    // Simplified sentiment analysis
    const positiveWords = [
      "great",
      "excellent",
      "amazing",
      "best",
      "good",
      "fantastic",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "worst",
      "poor",
      "disappointing",
    ];

    const text = contexts.join(" ").toLowerCase();
    const positiveCount = positiveWords.filter((word) =>
      text.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      text.includes(word)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  private generateRecommendations(
    fingerprint: SemanticFingerprint
  ): SemanticRecommendation[] {
    const recommendations: SemanticRecommendation[] = [];

    // Topic expansion recommendations
    fingerprint.contentGaps.forEach((gap) => {
      if (gap.priority === "high") {
        recommendations.push({
          type: "topic_expansion",
          title: `Expand coverage of ${gap.topic}`,
          description: gap.description,
          priority: gap.priority,
          estimatedImpact: 85,
          implementation: `Add 300-500 words covering: ${gap.suggestedKeywords.join(", ")}`,
        });
      }
    });

    // Semantic density optimization
    if (fingerprint.semanticDensity < 30) {
      recommendations.push({
        type: "keyword_optimization",
        title: "Improve keyword density",
        description:
          "Your content has low semantic density. Consider naturally incorporating more relevant keywords.",
        priority: "medium",
        estimatedImpact: 60,
        implementation:
          "Add 2-3 more mentions of primary keywords in natural contexts",
      });
    }

    // Entity enhancement
    const entityCount = Object.keys(fingerprint.entityCoverage).length;
    if (entityCount < 5) {
      recommendations.push({
        type: "entity_enhancement",
        title: "Include more relevant entities",
        description:
          "Adding authoritative entities can improve topical relevance.",
        priority: "medium",
        estimatedImpact: 70,
        implementation:
          "Mention industry leaders, tools, or authoritative sources",
      });
    }

    return recommendations.sort(
      (a, b) => b.estimatedImpact - a.estimatedImpact
    );
  }

  private async generateCompetitiveInsights(
    fingerprint: SemanticFingerprint,
    competitorData: Array<{ url: string; content: string }>
  ): Promise<CompetitiveInsight[]> {
    const insights: CompetitiveInsight[] = [];

    // Analyze each competitor
    for (const competitor of competitorData) {
      const competitorAnalysis = await this.analyzeContent(
        competitor.content,
        "",
        []
      );

      // Find gaps where competitor is stronger
      competitorAnalysis.fingerprint.topicClusters.forEach((compCluster) => {
        const ourCluster = fingerprint.topicClusters.find(
          (c) => c.name.toLowerCase() === compCluster.name.toLowerCase()
        );

        if (!ourCluster || ourCluster.coverage < compCluster.coverage) {
          insights.push({
            competitorUrl: competitor.url,
            advantage: `Strong coverage of ${compCluster.name}`,
            gap: ourCluster
              ? `Our coverage (${ourCluster.coverage}%) vs competitor (${compCluster.coverage}%)`
              : `Missing topic: ${compCluster.name}`,
            actionable: `Consider adding content about: ${compCluster.keywords.slice(0, 3).join(", ")}`,
          });
        }
      });
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private createVisualizationData(
    fingerprint: SemanticFingerprint
  ): VisualizationData {
    const nodes: VisualizationData["nodes"] = [];
    const edges: VisualizationData["edges"] = [];

    // Add topic nodes
    fingerprint.topicClusters.forEach((cluster) => {
      nodes.push({
        id: cluster.id,
        label: cluster.name,
        type: "topic",
        size: cluster.coverage,
        color: this.getTopicColor(cluster.relevanceScore),
      });

      // Add keyword nodes for each topic
      cluster.keywords.slice(0, 5).forEach((keyword, index) => {
        const keywordId = `${cluster.id}-keyword-${index}`;
        nodes.push({
          id: keywordId,
          label: keyword,
          type: "keyword",
          size: 30,
          color: SEMANTIC_EDGE_COLOR,
        });

        // Connect keyword to topic
        edges.push({
          source: cluster.id,
          target: keywordId,
          weight: cluster.coverage / 100,
          type: "hierarchical",
        });
      });
    });

    // Add entity nodes
    Object.entries(fingerprint.entityCoverage)
      .slice(0, 10)
      .forEach(([entity, data]) => {
        const entityId = `entity-${entity}`;
        nodes.push({
          id: entityId,
          label: entity,
          type: "entity",
          size: Math.min(50, data.mentions * 10),
          color: this.getSentimentColor(data.sentiment),
        });
      });

    return { nodes, edges };
  }

  private getTopicColor(relevanceScore: number): string {
    // Use design tokens instead of raw hex colors
    // Green -> success.500, Yellow -> colors.warning.500, Red -> destructive.500
    if (relevanceScore >= 80) return 'var(--color-success-500)';
    if (relevanceScore >= 60) return 'var(--color-warning-500)';
    return 'var(--color-destructive-500)';
  }

  private getSentimentColor(
    sentiment: "positive" | "neutral" | "negative"
  ): string {
    switch (sentiment) {
      case "positive":
        return 'var(--color-success-500)';
      case "negative":
        return 'var(--color-destructive-500)';
      default:
        return 'var(--color-gray-500)';
    }
  }
}
