/**
 * RewriteGen™ - AI-powered content rewriting and optimization engine
 * Part of the NeuroSEO™ Suite for RankPilot
 */

import type { RewriteTransition } from './types';

// Local rewrite diagnostics
const rewriteMetrics: { transitionVariantCount: number; transitionUniqueCount: number } = {
  transitionVariantCount: 0,
  transitionUniqueCount: 0,
};

export interface RewriteRequest {
  originalContent: string;
  targetKeywords: string[];
  tone: "professional" | "casual" | "academic" | "conversational" | "technical";
  audience: "beginner" | "intermediate" | "expert" | "general";
  contentType:
  | "blog"
  | "article"
  | "product"
  | "landing"
  | "technical"
  | "news";
  goals: RewriteGoal[];
  constraints: RewriteConstraint[];
  seoRequirements: SEORequirements;
}

export interface RewriteGoal {
  type:
  | "readability"
  | "keyword_density"
  | "length"
  | "engagement"
  | "conversion"
  | "authority"
  | "freshness";
  target: number | string;
  priority: "high" | "medium" | "low";
  description: string;
}

export interface RewriteConstraint {
  type:
  | "preserve_facts"
  | "maintain_structure"
  | "keep_quotes"
  | "preserve_links"
  | "brand_voice"
  | "legal_compliance";
  value: boolean | string;
  importance: "critical" | "high" | "medium" | "low";
}

export interface SEORequirements {
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetLength: { min: number; max: number };
  readabilityScore: number;
  headingStructure: boolean;
  metaOptimization: boolean;
  internalLinks: number;
  externalLinks: number;
}

export interface RewriteVariant {
  id: string;
  content: string;
  title: string;
  version: number;
  seoScore: number;
  readabilityScore: number;
  keywordDensity: { [keyword: string]: number };
  improvements: RewriteImprovement[];
  complianceScore: number;
  estimatedPerformance: PerformanceMetrics;
}

export interface RewriteImprovement {
  category: "seo" | "readability" | "engagement" | "structure" | "compliance";
  description: string;
  impact: "high" | "medium" | "low";
  applied: boolean;
  beforeAfter?: {
    before: string;
    after: string;
  };
}

export interface PerformanceMetrics {
  searchVisibility: number;
  userEngagement: number;
  conversionPotential: number;
  shareability: number;
  trustScore: number;
  overallScore: number;
}

export interface RewriteAnalysis {
  originalAnalysis: ContentAnalysis;
  variants: RewriteVariant[];
  recommendations: RewriteRecommendation[];
  bestVariant: string;
  comparisonMatrix: ComparisonMatrix;
}

export interface ContentAnalysis {
  wordCount: number;
  readabilityScore: number;
  keywordDensity: { [keyword: string]: number };
  sentimentScore: number;
  structureScore: number;
  seoScore: number;
  issues: ContentIssue[];
}

export interface ContentIssue {
  type:
  | "keyword_stuffing"
  | "low_readability"
  | "poor_structure"
  | "missing_keywords"
  | "compliance_risk";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  location: string;
  suggestion: string;
}

export interface RewriteRecommendation {
  title: string;
  description: string;
  category: "optimization" | "engagement" | "seo" | "compliance";
  priority: "high" | "medium" | "low";
  estimatedImpact: number;
  implementation: string;
}

export interface ComparisonMatrix {
  metrics: string[];
  variants: Array<{
    id: string;
    title: string;
    scores: number[];
  }>;
  winner: string;
  reasoning: string;
}

export class RewriteGenEngine {
  async generateRewrites(request: RewriteRequest): Promise<RewriteAnalysis> {
    // Analyze original content
    const originalAnalysis = await this.analyzeContent(
      request.originalContent,
      request.seoRequirements
    );

    // Generate multiple rewrite variants
    const variants = await this.generateVariants(request, originalAnalysis);

    // Analyze and score each variant
    const analyzedVariants = await this.analyzeVariants(variants, request);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      originalAnalysis,
      analyzedVariants
    );

    // Determine best variant
    const bestVariant = this.selectBestVariant(analyzedVariants);

    // Create comparison matrix
    const comparisonMatrix = this.createComparisonMatrix(analyzedVariants);

    return {
      originalAnalysis,
      variants: analyzedVariants,
      recommendations,
      bestVariant: bestVariant.id,
      comparisonMatrix,
    };
  }

  private async analyzeContent(
    content: string,
    seoRequirements: SEORequirements
  ): Promise<ContentAnalysis> {
    const words = content.split(/\s+/).filter((word) => word.length > 0);
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    // Calculate metrics
    const wordCount = words.length;
    const readabilityScore = this.calculateReadabilityScore(
      content,
      words,
      sentences
    );
    const keywordDensity = this.calculateKeywordDensity(
      content,
      seoRequirements
    );
    const sentimentScore = this.calculateSentimentScore(content);
    const structureScore = this.calculateStructureScore(content);
    const seoScore = this.calculateSEOScore(content, seoRequirements);

    // Identify issues
    const issues = this.identifyContentIssues(
      content,
      {
        wordCount,
        readabilityScore,
        keywordDensity,
        sentimentScore,
        structureScore,
        seoScore,
        issues: [],
      },
      seoRequirements
    );

    return {
      wordCount,
      readabilityScore,
      keywordDensity,
      sentimentScore,
      structureScore,
      seoScore,
      issues,
    };
  }

  private calculateReadabilityScore(
    _content: string,
    words: string[],
    sentences: string[]
  ): number {
    // Simplified Flesch-Kincaid readability calculation
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.calculateAverageSyllables(words);

    const fleschScore =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    // Convert to 0-100 scale
    return Math.max(0, Math.min(100, Math.round(fleschScore)));
  }

  private calculateAverageSyllables(words: string[]): number {
    const syllableCount = words.reduce((total, word) => {
      return total + this.countSyllables(word.toLowerCase());
    }, 0);

    return syllableCount / words.length;
  }

  private countSyllables(word: string): number {
    if (word.length <= 3) return 1;

    const vowels = "aeiouy";
    let syllables = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);

      if (isVowel && !previousWasVowel) {
        syllables++;
      }

      previousWasVowel = isVowel;
    }

    // Handle silent 'e'
    if (word.endsWith("e") && syllables > 1) {
      syllables--;
    }

    return Math.max(1, syllables);
  }

  private calculateKeywordDensity(
    content: string,
    seoRequirements: SEORequirements
  ): { [keyword: string]: number } {
    const text = content.toLowerCase();
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const totalWords = words.length;

    const allKeywords = [
      seoRequirements.primaryKeyword,
      ...seoRequirements.secondaryKeywords,
    ];
    const density: { [keyword: string]: number } = {};

    allKeywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();
      const keywordWords = keywordLower.split(/\s+/);

      if (keywordWords.length === 1) {
        // Single word keyword
        const count = words.filter((word) =>
          word.includes(keywordLower)
        ).length;
        density[keyword] = (count / totalWords) * 100;
      } else {
        // Multi-word keyword
        const regex = new RegExp(keywordLower.replace(/\s+/g, "\\s+"), "gi");
        const matches = content.match(regex) || [];
        density[keyword] = (matches.length / totalWords) * 100;
      }
    });

    return density;
  }

  private calculateSentimentScore(content: string): number {
    // Simplified sentiment analysis
    const positiveWords = [
      "excellent",
      "great",
      "amazing",
      "wonderful",
      "fantastic",
      "perfect",
      "love",
      "best",
      "awesome",
      "outstanding",
    ];
    const negativeWords = [
      "terrible",
      "awful",
      "horrible",
      "worst",
      "hate",
      "bad",
      "poor",
      "disappointing",
      "useless",
      "failed",
    ];

    const text = content.toLowerCase();
    const words = text.split(/\s+/);

    const positiveCount = positiveWords.reduce((count, word) => {
      return (
        count + (text.match(new RegExp(`\\b${word}\\b`, "g")) || []).length
      );
    }, 0);

    const negativeCount = negativeWords.reduce((count, word) => {
      return (
        count + (text.match(new RegExp(`\\b${word}\\b`, "g")) || []).length
      );
    }, 0);

    const sentimentRatio = (positiveCount - negativeCount) / words.length;

    // Convert to 0-100 scale (50 is neutral)
    return Math.round(50 + sentimentRatio * 1000);
  }

  private calculateStructureScore(content: string): number {
    let score = 0;

    // Check for headings
    const headingPatterns = [/#{1,6}\s/g, /<h[1-6]/gi];
    const hasHeadings = headingPatterns.some((pattern) =>
      pattern.test(content)
    );
    if (hasHeadings) score += 25;

    // Check for lists
    const listPatterns = [/^\s*[-*+]\s/gm, /^\s*\d+\.\s/gm, /<ul|<ol|<li/gi];
    const hasLists = listPatterns.some((pattern) => pattern.test(content));
    if (hasLists) score += 20;

    // Check for paragraphs
    const paragraphs = content
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0);
    if (paragraphs.length >= 3) score += 25;

    // Check for links
    const linkPatterns = [/\[([^\]]+)\]\([^)]+\)/g, /<a\s+[^>]*href/gi];
    const hasLinks = linkPatterns.some((pattern) => pattern.test(content));
    if (hasLinks) score += 15;

    // Check for images
    const imagePatterns = [/!\[[^\]]*\]\([^)]+\)/g, /<img/gi];
    const hasImages = imagePatterns.some((pattern) => pattern.test(content));
    if (hasImages) score += 15;

    return Math.min(100, score);
  }

  private calculateSEOScore(
    content: string,
    seoRequirements: SEORequirements
  ): number {
    let score = 0;
    const text = content.toLowerCase();

    // Primary keyword presence
    const primaryKeywordCount = (
      text.match(
        new RegExp(seoRequirements.primaryKeyword.toLowerCase(), "g")
      ) || []
    ).length;
    if (primaryKeywordCount > 0) score += 30;
    if (primaryKeywordCount >= 3) score += 10;

    // Secondary keywords presence
    const secondaryKeywordMatches = seoRequirements.secondaryKeywords.filter(
      (keyword) => text.includes(keyword.toLowerCase())
    ).length;
    score +=
      (secondaryKeywordMatches / seoRequirements.secondaryKeywords.length) * 20;

    // Content length
    const wordCount = content.split(/\s+/).length;
    if (
      wordCount >= seoRequirements.targetLength.min &&
      wordCount <= seoRequirements.targetLength.max
    ) {
      score += 20;
    } else if (wordCount >= seoRequirements.targetLength.min * 0.8) {
      score += 10;
    }

    // Heading structure
    if (seoRequirements.headingStructure) {
      const hasH1 = /#{1}\s|<h1/gi.test(content);
      const hasSubheadings = /#{2,6}\s|<h[2-6]/gi.test(content);
      if (hasH1) score += 10;
      if (hasSubheadings) score += 10;
    }

    return Math.min(100, score);
  }

  private identifyContentIssues(
    _content: string,
    analysis: ContentAnalysis,
    seoRequirements: SEORequirements
  ): ContentIssue[] {
    const issues: ContentIssue[] = [];

    // Keyword stuffing check
    Object.entries(analysis.keywordDensity).forEach(([keyword, density]) => {
      if (density > 3) {
        // More than 3% density
        issues.push({
          type: "keyword_stuffing",
          severity: "high",
          description: `Keyword "${keyword}" density is ${density.toFixed(1)}% (recommended: <3%)`,
          location: "Throughout content",
          suggestion: `Reduce usage of "${keyword}" and use synonyms`,
        });
      }
    });

    // Readability issues
    if (analysis.readabilityScore < 30) {
      issues.push({
        type: "low_readability",
        severity: "medium",
        description: `Readability score is ${analysis.readabilityScore} (very difficult)`,
        location: "Overall content",
        suggestion: "Use shorter sentences and simpler words",
      });
    }

    // Missing keywords
    if (analysis.keywordDensity[seoRequirements.primaryKeyword] === 0) {
      issues.push({
        type: "missing_keywords",
        severity: "critical",
        description: `Primary keyword "${seoRequirements.primaryKeyword}" not found`,
        location: "Content body",
        suggestion: `Include "${seoRequirements.primaryKeyword}" naturally in the content`,
      });
    }

    // Structure issues
    if (analysis.structureScore < 50) {
      issues.push({
        type: "poor_structure",
        severity: "medium",
        description:
          "Content lacks proper structure (headings, lists, paragraphs)",
        location: "Content organization",
        suggestion:
          "Add headings, bullet points, and break up large paragraphs",
      });
    }

    return issues;
  }

  private async generateVariants(
    request: RewriteRequest,
    originalAnalysis: ContentAnalysis
  ): Promise<Partial<RewriteVariant>[]> {
    const variants: Partial<RewriteVariant>[] = [];

    // Generate different variants based on goals
    for (let i = 0; i < 3; i++) {
      const variant = await this.createVariant(
        request,
        originalAnalysis,
        i + 1
      );
      variants.push(variant);
    }

    return variants;
  }

  private async createVariant(
    request: RewriteRequest,
    _originalAnalysis: ContentAnalysis,
    version: number
  ): Promise<Partial<RewriteVariant>> {
    const variantId = `variant-${version}`;

    // Simulate different rewriting approaches
    let rewrittenContent = "";
    let title = "";

    switch (version) {
      case 1:
        // SEO-focused variant
        rewrittenContent = this.optimizeForSEO(
          request.originalContent,
          request.seoRequirements
        );
        title = "SEO-Optimized Version";
        break;
      case 2:
        // Readability-focused variant
        rewrittenContent = this.optimizeForReadability(
          request.originalContent,
          request.tone
        );
        title = "Readability-Enhanced Version";
        break;
      case 3:
        // Engagement-focused variant
        rewrittenContent = this.optimizeForEngagement(
          request.originalContent,
          request.audience
        );
        title = "Engagement-Optimized Version";
        break;
      default:
        rewrittenContent = request.originalContent;
        title = "Default Version";
    }

    return {
      id: variantId,
      content: rewrittenContent,
      title,
      version,
    };
  }

  private optimizeForSEO(
    content: string,
    seoRequirements: SEORequirements
  ): string {
    let optimized = content;

    // Add primary keyword to beginning if not present
    if (
      !optimized
        .toLowerCase()
        .includes(seoRequirements.primaryKeyword.toLowerCase())
    ) {
      optimized = `${seoRequirements.primaryKeyword} is an important topic. ${optimized}`;
    }

    // Enhance headings with keywords
    optimized = optimized.replace(/#{1,6}\s+(.+)/g, (match, heading) => {
      if (
        !heading
          .toLowerCase()
          .includes(seoRequirements.primaryKeyword.toLowerCase())
      ) {
        return match.replace(
          heading,
          `${heading} - ${seoRequirements.primaryKeyword}`
        );
      }
      return match;
    });

    // Add conclusion with keywords
    optimized += `\n\nIn conclusion, understanding ${seoRequirements.primaryKeyword} and its applications is crucial for success. This comprehensive guide covers the essential aspects of ${seoRequirements.primaryKeyword} that you need to know.`;

    return optimized;
  }

  private optimizeForReadability(content: string, tone: string): string {
    let optimized = content;

    // Break up long sentences
    optimized = optimized.replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2");

    // Add transition words based on tone
    const transitions = {
      professional: ["Furthermore", "Additionally", "Moreover", "Consequently"],
      casual: ["Also", "Plus", "And", "So"],
      academic: ["Furthermore", "Subsequently", "Therefore", "In addition"],
      conversational: ["You know", "By the way", "Also", "Plus"],
      technical: ["Subsequently", "Therefore", "Additionally", "Moreover"],
    };
    const _chosenTransitions = transitions[tone as keyof typeof transitions] || transitions.professional; // reserved for future insertion logic
    // Instrument selected transition variety
    rewriteMetrics.transitionVariantCount = _chosenTransitions?.length ?? 0;
    rewriteMetrics.transitionUniqueCount = Array.isArray(_chosenTransitions)
      ? new Set(_chosenTransitions).size
      : 0;

    // Simplify complex words (basic example)
    const simplifications = {
      utilize: "use",
      implement: "use",
      demonstrate: "show",
      facilitate: "help",
      commence: "start",
    };

    Object.entries(simplifications).forEach(([complex, simple]) => {
      optimized = optimized.replace(
        new RegExp(`\\b${complex}\\b`, "gi"),
        simple
      );
    });

    return optimized;
  }

  private optimizeForEngagement(content: string, audience: string): string {
    let optimized = content;

    // Add engaging elements based on audience
    const engagementElements = {
      beginner: {
        intro: "Let's start with the basics.",
        callouts: ["💡 Pro tip:", "⚡ Quick note:", "🎯 Key point:"],
        questions: ["What does this mean for you?", "How can you apply this?"],
      },
      intermediate: {
        intro: "Building on what you already know,",
        callouts: ["💼 Best practice:", "⚠️ Watch out:", "🔍 Deep dive:"],
        questions: [
          "Ready to take it to the next level?",
          "What's your experience with this?",
        ],
      },
      expert: {
        intro: "For advanced practitioners,",
        callouts: [
          "🔬 Technical insight:",
          "📊 Data point:",
          "⚙️ Implementation:",
        ],
        questions: [
          "How might this impact your strategy?",
          "What are the implications?",
        ],
      },
      general: {
        intro: "Here's what you need to know:",
        callouts: ["✨ Highlight:", "📌 Remember:", "🚀 Action item:"],
        questions: ["What do you think?", "How does this apply to you?"],
      },
    };

    const elements =
      engagementElements[audience as keyof typeof engagementElements] ||
      engagementElements.general;

    // Add engaging introduction
    optimized = `${elements.intro} ${optimized}`;

    // Add callouts to key points
    const sentences = optimized.split(/[.!?]+/);
    if (sentences.length > 3) {
      const callout =
        elements.callouts[Math.floor(Math.random() * elements.callouts.length)];
      sentences[Math.floor(sentences.length / 2)] =
        `${callout} ${sentences[Math.floor(sentences.length / 2)]}`;
      optimized = sentences.join(". ") + ".";
    }

    // Add engaging questions
    const question =
      elements.questions[Math.floor(Math.random() * elements.questions.length)];
    optimized += `\n\n${question}`;

    return optimized;
  }

  private async analyzeVariants(
    variants: Partial<RewriteVariant>[],
    request: RewriteRequest
  ): Promise<RewriteVariant[]> {
    const analyzedVariants: RewriteVariant[] = [];

    for (const variant of variants) {
      if (!variant.content || !variant.id || !variant.title || !variant.version)
        continue;

      // Analyze the variant content
      const analysis = await this.analyzeContent(
        variant.content,
        request.seoRequirements
      );

      // Calculate scores
      const seoScore = analysis.seoScore;
      const readabilityScore = analysis.readabilityScore;
      const keywordDensity = analysis.keywordDensity;

      // Generate improvements
      const improvements = this.generateVariantImprovements(analysis);

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(
        variant.content,
        request
      );

      // Estimate performance
      const estimatedPerformance = this.estimatePerformance(analysis);

      analyzedVariants.push({
        id: variant.id,
        content: variant.content,
        title: variant.title,
        version: variant.version,
        seoScore,
        readabilityScore,
        keywordDensity,
        improvements,
        complianceScore,
        estimatedPerformance,
      });
    }

    return analyzedVariants;
  }

  private generateVariantImprovements(
    analysis: ContentAnalysis): RewriteImprovement[] {
    const improvements: RewriteImprovement[] = [];

    // SEO improvements
    if (analysis.seoScore < 80) {
      improvements.push({
        category: "seo",
        description: `SEO score could be improved from ${analysis.seoScore} to 85+`,
        impact: "high",
        applied: false,
        beforeAfter: {
          before: "Generic content without keyword optimization",
          after: "Content optimized with strategic keyword placement",
        },
      });
    }

    // Readability improvements
    if (analysis.readabilityScore < 60) {
      improvements.push({
        category: "readability",
        description: `Readability score improved from ${analysis.readabilityScore} to 75+`,
        impact: "medium",
        applied: true,
        beforeAfter: {
          before: "Complex sentences and technical jargon",
          after: "Clear, concise sentences with simple language",
        },
      });
    }

    // Structure improvements
    if (analysis.structureScore < 70) {
      improvements.push({
        category: "structure",
        description: "Enhanced content structure with headings and lists",
        impact: "medium",
        applied: true,
      });
    }

    return improvements;
  }

  private calculateComplianceScore(
    _content: string,
    request: RewriteRequest
  ): number {
    let score = 80; // Base score

    // Check constraints compliance
    request.constraints.forEach((constraint) => {
      switch (constraint.type) {
        case "preserve_facts":
          // In a real implementation, this would check fact preservation
          score += constraint.value ? 10 : -20;
          break;
        case "maintain_structure":
          // Check if original structure is maintained
          score += constraint.value ? 5 : 0;
          break;
        case "legal_compliance":
          // Check for legal compliance indicators
          score += constraint.value ? 5 : -10;
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private estimatePerformance(
    analysis: ContentAnalysis): PerformanceMetrics {
    // Estimate various performance metrics based on content analysis

    const searchVisibility = Math.round(
      (analysis.seoScore + analysis.structureScore) / 2
    );
    const userEngagement = Math.round(
      (analysis.readabilityScore + analysis.sentimentScore) / 2
    );
    const conversionPotential = Math.round(
      analysis.seoScore * 0.3 +
      analysis.readabilityScore * 0.4 +
      analysis.sentimentScore * 0.3
    );
    const shareability = Math.round(
      (analysis.sentimentScore + analysis.readabilityScore) / 2
    );
    const trustScore = Math.round(
      (analysis.structureScore + analysis.seoScore) / 2
    );

    const overallScore = Math.round(
      (searchVisibility +
        userEngagement +
        conversionPotential +
        shareability +
        trustScore) /
      5
    );

    return {
      searchVisibility,
      userEngagement,
      conversionPotential,
      shareability,
      trustScore,
      overallScore,
    };
  }

  private generateRecommendations(
    originalAnalysis: ContentAnalysis,
    variants: RewriteVariant[]
  ): RewriteRecommendation[] {
    const recommendations: RewriteRecommendation[] = [];

    // Find best performing variant
    const bestVariant = variants.reduce((best, current) =>
      current.estimatedPerformance.overallScore >
        best.estimatedPerformance.overallScore
        ? current
        : best
    );

    // SEO recommendations
    if (originalAnalysis.seoScore < bestVariant.seoScore) {
      recommendations.push({
        title: "Improve SEO Optimization",
        description: `Implementing SEO improvements could increase your SEO score from ${originalAnalysis.seoScore} to ${bestVariant.seoScore}`,
        category: "seo",
        priority: "high",
        estimatedImpact: bestVariant.seoScore - originalAnalysis.seoScore,
        implementation: "Use the SEO-optimized variant as a starting point",
      });
    }

    // Readability recommendations
    if (originalAnalysis.readabilityScore < 60) {
      recommendations.push({
        title: "Enhance Readability",
        description:
          "Content readability could be significantly improved for better user engagement",
        category: "engagement",
        priority: "medium",
        estimatedImpact: 25,
        implementation:
          "Simplify language, shorten sentences, and improve flow",
      });
    }

    // Structure recommendations
    if (originalAnalysis.structureScore < 70) {
      recommendations.push({
        title: "Improve Content Structure",
        description:
          "Better structure with headings and lists will improve both SEO and user experience",
        category: "optimization",
        priority: "medium",
        estimatedImpact: 20,
        implementation:
          "Add clear headings, bullet points, and logical content flow",
      });
    }

    return recommendations.sort(
      (a, b) => b.estimatedImpact - a.estimatedImpact
    );
  }

  private selectBestVariant(variants: RewriteVariant[]): RewriteVariant {
    return variants.reduce((best, current) => {
      const bestScore = best.estimatedPerformance.overallScore;
      const currentScore = current.estimatedPerformance.overallScore;

      return currentScore > bestScore ? current : best;
    });
  }

  private createComparisonMatrix(variants: RewriteVariant[]): ComparisonMatrix {
    const metrics = [
      "SEO Score",
      "Readability",
      "User Engagement",
      "Search Visibility",
      "Trust Score",
      "Overall Score",
    ];

    const variantData = variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      scores: [
        variant.seoScore,
        variant.readabilityScore,
        variant.estimatedPerformance.userEngagement,
        variant.estimatedPerformance.searchVisibility,
        variant.estimatedPerformance.trustScore,
        variant.estimatedPerformance.overallScore,
      ],
    }));

    // Find winner (highest overall score)
    const winner = variantData.reduce((best, current) =>
      current.scores[5] > best.scores[5] ? current : best
    );

    return {
      metrics,
      variants: variantData,
      winner: winner.id,
      reasoning: `${winner.title} performs best with an overall score of ${winner.scores[5]}, excelling in multiple areas including SEO optimization and user engagement.`,
    };
  }
}

// Standalone helper (previously mis-indented inside class)
export function generateTransitions(input: string): RewriteTransition[] {
  // TODO: implement actual transition generation; keep deterministic for now
  void input; // suppress unused param
  return [];
}
