/**
 * NeuroSEO™ Suite - Main orchestrator for all NeuroSEO™ components
 * Part of RankPilot Studio
 */

import { UsageQuotaManager, type UsageCheck } from "../usage-quota";
import {
  AIVisibilityEngine,
  type VisibilityReport,
} from "./ai-visibility-engine";
import { NeuralCrawler, type CrawlResult } from "./neural-crawler";
import {
  RewriteGenEngine,
  type RewriteAnalysis,
  type RewriteRequest,
} from "./rewrite-gen";
import { SemanticMap, type SemanticAnalysisResult } from "./semantic-map";
import { TrustBlockEngine, type TrustReport } from "./trust-block";

export interface NeuroSEOAnalysisRequest {
  urls: string[];
  targetKeywords: string[];
  competitorUrls?: string[];
  analysisType:
  | "comprehensive"
  | "seo-focused"
  | "content-focused"
  | "competitive";
  userPlan: string;
  userId: string;
}

export interface NeuroSEOReport {
  id: string;
  timestamp: string;
  _request: NeuroSEOAnalysisRequest;
  crawlResults: CrawlResult[];
  semanticAnalysis: SemanticAnalysisResult[];
  visibilityAnalysis: VisibilityReport[];
  trustAnalysis: TrustReport[];
  rewriteRecommendations?: RewriteAnalysis[];
  overallScore: number;
  keyInsights: KeyInsight[];
  actionableTasks: ActionableTask[];
  competitivePositioning?: CompetitivePositioning;
  quotaUsage: UsageCheck;
}

// Simplified version for Content Analyzer compatibility
export interface SimpleRewriteAnalysis {
  summary: string;
  improvements: string[];
  seoImpact: {
    readability: number;
    keywordDensity: number;
    semanticRelevance: number;
  };
}

export interface KeyInsight {
  category: "seo" | "content" | "technical" | "competitive" | "trust";
  title: string;
  description: string;
  impact: "critical" | "high" | "medium" | "low";
  confidence: number;
  evidence: string[];
  recommendation: string;
}

export interface ActionableTask {
  id: string;
  title: string;
  description: string;
  category: "content" | "technical" | "seo" | "competitive";
  priority: "urgent" | "high" | "medium" | "low";
  estimatedEffort: "low" | "medium" | "high";
  estimatedImpact: number;
  timeframe: string;
  dependencies: string[];
  resources: TaskResource[];
}

export interface TaskResource {
  type: "article" | "tool" | "template" | "guide";
  title: string;
  url?: string;
  description: string;
}

export interface CompetitivePositioning {
  overallRanking: number;
  totalCompetitors: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}

export class NeuroSEOSuite {
  private neuralCrawler: NeuralCrawler;
  private semanticEngine: SemanticMap;
  private visibilityEngine: AIVisibilityEngine;
  private trustEngine: TrustBlockEngine;
  private rewriteEngine: RewriteGenEngine;
  private quotaManager: UsageQuotaManager;

  constructor() {
    this.neuralCrawler = new NeuralCrawler();
    this.semanticEngine = new SemanticMap();
    this.visibilityEngine = new AIVisibilityEngine();
    this.trustEngine = new TrustBlockEngine();
    this.rewriteEngine = new RewriteGenEngine();
    this.quotaManager = new UsageQuotaManager();
  }

  async runAnalysis(_request: NeuroSEOAnalysisRequest): Promise<NeuroSEOReport> {
    const reportId = `neuro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check quota before proceeding
    const quotaCheck = await this.quotaManager.checkUsageLimit(
      request.userId,
      "report"
    );
    if (!quotaCheck.allowed) {
      throw new Error(`Quota exceeded: ${quotaCheck.reason}`);
    }

    try {
      // Record quota usage
      await this.quotaManager.incrementUsage(request.userId, "report", 1);

      const report: NeuroSEOReport = {
        id: reportId,
        timestamp: new Date().toISOString(),
        _request,
        crawlResults: [],
        semanticAnalysis: [],
        visibilityAnalysis: [],
        trustAnalysis: [],
        overallScore: 0,
        keyInsights: [],
        actionableTasks: [],
        quotaUsage: quotaCheck,
      };

      // Phase 1: Neural Crawling
      console.log("🕷️ Starting Neural Crawling phase...");
      report.crawlResults = await this.runCrawlPhase(request.urls);

      // Phase 2: Semantic Analysis
      console.log("🧠 Starting Semantic Analysis phase...");
      report.semanticAnalysis = await this.runSemanticPhase(
        report.crawlResults,
        request.targetKeywords
      );

      // Phase 3: AI Visibility Analysis
      console.log("👁️ Starting AI Visibility Analysis phase...");
      report.visibilityAnalysis = await this.runVisibilityPhase(
        request.urls,
        request.targetKeywords,
        request.competitorUrls
      );

      // Phase 4: Trust Analysis
      console.log("🛡️ Starting Trust Analysis phase...");
      report.trustAnalysis = await this.runTrustPhase(
        report.crawlResults,
        request.competitorUrls
      );

      // Phase 5: Content Rewrite Recommendations (if content-focused)
      if (
        request.analysisType === "content-focused" ||
        request.analysisType === "comprehensive"
      ) {
        console.log("✍️ Generating Content Rewrite Recommendations...");
        report.rewriteRecommendations =
          await this.generateRewriteRecommendations(
            report.crawlResults,
            request.targetKeywords
          );
      }

      // Phase 6: Competitive Positioning (if competitive analysis requested)
      if (
        request.analysisType === "competitive" ||
        request.analysisType === "comprehensive"
      ) {
        console.log("🏆 Analyzing Competitive Positioning...");
        report.competitivePositioning =
          await this.analyzeCompetitivePositioning(
            report,
            request.competitorUrls || []
          );
      }

      // Phase 7: Generate Insights and Tasks
      console.log("💡 Generating insights and actionable tasks...");
      report.keyInsights = this.generateKeyInsights(report);
      report.actionableTasks = this.generateActionableTasks(report);
      report.overallScore = this.calculateOverallScore(report);

      console.log(
        `✅ NeuroSEO™ analysis complete! Overall score: ${report.overallScore}/100`
      );
      return report;
    } catch (_error) {
      console.error("❌ NeuroSEO™ analysis failed:", _error);
      throw error;
    }
  }

  private async runCrawlPhase(urls: string[]): Promise<CrawlResult[]> {
    const crawlResults: CrawlResult[] = [];

    for (const url of urls) {
      try {
        const crawlReport = await this.neuralCrawler.crawl(url, {
          includeImages: true,
          followRedirects: true,
          extractSchema: true,
          analyzeAuthorship: true,
          timeout: 30000,
        });
        crawlResults.push(crawlReport);
      } catch (_error) {
        console.warn(`⚠️ Failed to crawl ${url}:`, _error);
        // Continue with other URLs
      }
    }

    return crawlResults;
  }

  private async runSemanticPhase(
    crawlResults: CrawlResult[],
    targetKeywords: string[]
  ): Promise<unknown[]> {
    const semanticResults: unknown[] = [];

    for (const crawlResult of crawlResults) {
      try {
        // const semanticReport = await this.semanticEngine.analyzeContent(
        //   crawlResult.content.textContent,
        //   targetKeywords,
        //   crawlResult.metadata.title || "Untitled"
        // );
        // semanticResults.push(semanticReport);
      } catch (_error) {
        console.warn(
          `⚠️ Failed semantic analysis for ${crawlResult.url}:`,
          _error
        );
      }
    }

    return semanticResults;
  }

  private async runVisibilityPhase(
    urls: string[],
    targetKeywords: string[],
    competitorUrls?: string[]
  ): Promise<VisibilityReport[]> {
    const visibilityResults: VisibilityReport[] = [];

    for (const url of urls) {
      try {
        const visibilityReport = await this.visibilityEngine.analyzeVisibility(
          url,
          targetKeywords,
          competitorUrls
        );
        visibilityResults.push(visibilityReport);
      } catch (_error) {
        console.warn(`⚠️ Failed visibility analysis for ${url}:`, _error);
      }
    }

    return visibilityResults;
  }

  private async runTrustPhase(
    crawlResults: CrawlResult[],
    competitorUrls?: string[]
  ): Promise<TrustReport[]> {
    const trustResults: TrustReport[] = [];

    for (const crawlResult of crawlResults) {
      try {
        const trustReport = await this.trustEngine.analyzeTrust(
          crawlResult.url,
          crawlResult.content,
          crawlResult.metadata.author,
          competitorUrls
        );
        trustResults.push(trustReport);
      } catch (_error) {
        console.warn(`⚠️ Failed trust analysis for ${crawlResult.url}:`, _error);
      }
    }

    return trustResults;
  }

  private async generateRewriteRecommendations(
    crawlResults: CrawlResult[],
    targetKeywords: string[]
  ): Promise<RewriteAnalysis[]> {
    const rewriteResults: RewriteAnalysis[] = [];

    for (const crawlResult of crawlResults) {
      try {
        const rewriteRequest: RewriteRequest = {
          originalContent: crawlResult.content,
          targetKeywords,
          tone: "professional",
          audience: "general",
          contentType: "article",
          goals: [
            {
              type: "keyword_density",
              target: 2.5,
              priority: "high",
              description: "Optimize keyword density to 2-3%",
            },
            {
              type: "readability",
              target: 70,
              priority: "medium",
              description: "Improve readability score to 70+",
            },
          ],
          constraints: [
            {
              type: "preserve_facts",
              _value: true,
              importance: "critical",
            },
          ],
          seoRequirements: {
            primaryKeyword: targetKeywords[0] || "",
            secondaryKeywords: targetKeywords.slice(1),
            targetLength: { min: 800, max: 2000 },
            readabilityScore: 70,
            headingStructure: true,
            metaOptimization: true,
            internalLinks: 3,
            externalLinks: 2,
          },
        };

        const rewriteAnalysis =
          await this.rewriteEngine.generateRewrites(rewriteRequest);
        rewriteResults.push(rewriteAnalysis);
      } catch (_error) {
        console.warn(
          `⚠️ Failed rewrite analysis for ${crawlResult.url}:`,
          _error
        );
      }
    }

    return rewriteResults;
  }

  private async analyzeCompetitivePositioning(
    report: NeuroSEOReport,
    competitorUrls: string[]
  ): Promise<CompetitivePositioning> {
    // Calculate competitive metrics based on all analysis results
    const ourScores = {
      seo: this.calculateAverageSEOScore(report),
      visibility: this.calculateAverageVisibilityScore(report),
      trust: this.calculateAverageTrustScore(report),
      semantic: this.calculateAverageSemanticScore(report),
    };

    // Estimate competitor scores (in production, this would be based on actual competitive analysis)
    const competitorScores = competitorUrls.map((url) => ({
      url,
      seo: Math.floor(Math.random() * 40) + 60, // 60-100
      visibility: Math.floor(Math.random() * 50) + 50, // 50-100
      trust: Math.floor(Math.random() * 30) + 70, // 70-100
      semantic: Math.floor(Math.random() * 40) + 60, // 60-100
    }));

    const ourOverallScore =
      (ourScores.seo +
        ourScores.visibility +
        ourScores.trust +
        ourScores.semantic) /
      4;
    const competitorOverallScores = competitorScores.map(
      (comp) => (comp.seo + comp.visibility + comp.trust + comp.semantic) / 4
    );

    const betterCompetitors = competitorOverallScores.filter(
      (score) => score > ourOverallScore
    ).length;
    const ranking = betterCompetitors + 1;

    return {
      overallRanking: ranking,
      totalCompetitors: competitorUrls.length + 1,
      strengths: this.identifyStrengths(ourScores, competitorScores),
      weaknesses: this.identifyWeaknesses(ourScores, competitorScores),
      opportunities: this.identifyOpportunities(report),
      threats: this.identifyThreats(competitorScores),
      recommendations: this.generateCompetitiveRecommendations(
        ourScores,
        competitorScores
      ),
    };
  }

  private calculateAverageSEOScore(report: NeuroSEOReport): number {
    if (report.crawlResults.length === 0) return 0;
    return Math.round(
      report.crawlResults.reduce(
        (sum, _result) => sum + ((result as any).seoMetrics?.overallScore || 0),
        0
      ) / report.crawlResults.length
    );
  }

  private calculateAverageVisibilityScore(report: NeuroSEOReport): number {
    if (report.visibilityAnalysis.length === 0) return 0;
    return Math.round(
      report.visibilityAnalysis.reduce(
        (sum, _result) => sum + result.metrics.overallVisibilityScore,
        0
      ) / report.visibilityAnalysis.length
    );
  }

  private calculateAverageTrustScore(report: NeuroSEOReport): number {
    if (report.trustAnalysis.length === 0) return 0;
    return Math.round(
      report.trustAnalysis.reduce(
        (sum, _result) => sum + result.metrics.overallEATScore,
        0
      ) / report.trustAnalysis.length
    );
  }

  private calculateAverageSemanticScore(report: NeuroSEOReport): number {
    if ((report as any).semanticAnalysis?.length === 0) return 0;
    return Math.round(
      (report as any).semanticAnalysis?.reduce(
        (sum: number, _result: unknown) => sum + result.overallRelevanceScore,
        0
      ) / (report as any).semanticAnalysis?.length || 0
    );
  }

  private identifyStrengths(ourScores: unknown, competitorScores: unknown[]): string[] {
    const strengths: string[] = [];
    const avgCompetitorSEO =
      competitorScores.reduce((sum, comp) => sum + comp.seo, 0) /
      competitorScores.length;
    const avgCompetitorVisibility =
      competitorScores.reduce((sum, comp) => sum + comp.visibility, 0) /
      competitorScores.length;
    const avgCompetitorTrust =
      competitorScores.reduce((sum, comp) => sum + comp.trust, 0) /
      competitorScores.length;

    if (ourScores.seo > avgCompetitorSEO + 10)
      strengths.push("Strong SEO optimization");
    if (ourScores.visibility > avgCompetitorVisibility + 10)
      strengths.push("High AI visibility");
    if (ourScores.trust > avgCompetitorTrust + 10)
      strengths.push("Excellent trustworthiness");
    if (ourScores.semantic > 80) strengths.push("Superior semantic relevance");

    return strengths;
  }

  private identifyWeaknesses(
    ourScores: unknown,
    competitorScores: unknown[]
  ): string[] {
    const weaknesses: string[] = [];
    const avgCompetitorSEO =
      competitorScores.reduce((sum, comp) => sum + comp.seo, 0) /
      competitorScores.length;
    const avgCompetitorVisibility =
      competitorScores.reduce((sum, comp) => sum + comp.visibility, 0) /
      competitorScores.length;
    const avgCompetitorTrust =
      competitorScores.reduce((sum, comp) => sum + comp.trust, 0) /
      competitorScores.length;

    if (ourScores.seo < avgCompetitorSEO - 10)
      weaknesses.push("SEO optimization needs improvement");
    if (ourScores.visibility < avgCompetitorVisibility - 10)
      weaknesses.push("Low AI visibility");
    if (ourScores.trust < avgCompetitorTrust - 10)
      weaknesses.push("Trust signals need strengthening");
    if (ourScores.semantic < 60)
      weaknesses.push("Semantic relevance could be improved");

    return weaknesses;
  }

  private identifyOpportunities(report: NeuroSEOReport): string[] {
    const opportunities: string[] = [];

    // Check for common improvement opportunities
    const lowVisibilityQueries = report.visibilityAnalysis
      .flatMap((analysis) => analysis.metrics.improvementOpportunities)
      .slice(0, 3);

    if (lowVisibilityQueries.length > 0) {
      opportunities.push("Untapped keyword opportunities identified");
    }

    if (
      report.trustAnalysis.some(
        (analysis) => analysis.metrics.overallEATScore < 70
      )
    ) {
      opportunities.push("Significant trust improvement potential");
    }

    if (
      report.rewriteRecommendations &&
      report.rewriteRecommendations.length > 0
    ) {
      opportunities.push("Content optimization opportunities available");
    }

    return opportunities;
  }

  private identifyThreats(competitorScores: unknown[]): string[] {
    const threats: string[] = [];

    const strongCompetitors = competitorScores.filter(
      (comp) =>
        (comp.seo + comp.visibility + comp.trust + comp.semantic) / 4 > 85
    );

    if (strongCompetitors.length > 0) {
      threats.push(
        `${strongCompetitors.length} strong competitor(s) with high performance`
      );
    }

    if (competitorScores.some((comp) => comp.visibility > 90)) {
      threats.push("Competitors with superior AI visibility");
    }

    return threats;
  }

  private generateCompetitiveRecommendations(
    ourScores: unknown,
    competitorScores: unknown[]
  ): string[] {
    const recommendations: string[] = [];

    const avgCompetitorSEO =
      competitorScores.reduce((sum, comp) => sum + comp.seo, 0) /
      competitorScores.length;

    if (ourScores.seo < avgCompetitorSEO) {
      recommendations.push(
        "Prioritize SEO optimization to match competitor performance"
      );
    }

    if (ourScores.visibility < 70) {
      recommendations.push(
        "Focus on AI visibility improvements for better LLM citation rates"
      );
    }

    if (ourScores.trust < 80) {
      recommendations.push(
        "Strengthen E-A-T signals to build content authority"
      );
    }

    return recommendations;
  }

  private generateKeyInsights(report: NeuroSEOReport): KeyInsight[] {
    const insights: KeyInsight[] = [];

    // SEO insights
    const avgSEOScore = this.calculateAverageSEOScore(report);
    if (avgSEOScore < 70) {
      insights.push({
        category: "seo",
        title: "SEO Performance Below Optimal",
        description: `Average SEO score of ${avgSEOScore} indicates significant optimization opportunities`,
        impact: "high",
        confidence: 0.9,
        evidence: [
          "Low keyword optimization",
          "Missing technical SEO elements",
        ],
        recommendation: "Implement comprehensive SEO optimization strategy",
      });
    }

    // Trust insights
    const avgTrustScore = this.calculateAverageTrustScore(report);
    if (avgTrustScore < 70) {
      insights.push({
        category: "trust",
        title: "Trust Signals Need Strengthening",
        description: `E-A-T score of ${avgTrustScore} suggests content authority improvements needed`,
        impact: "high",
        confidence: 0.85,
        evidence: ["Limited author credentials", "Few authoritative sources"],
        recommendation:
          "Enhance expertise, authoritativeness, and trustworthiness signals",
      });
    }

    // Visibility insights
    const avgVisibilityScore = this.calculateAverageVisibilityScore(report);
    if (avgVisibilityScore < 60) {
      insights.push({
        category: "competitive",
        title: "Low AI Visibility Detected",
        description: `AI visibility score of ${avgVisibilityScore} indicates poor LLM citation performance`,
        impact: "critical",
        confidence: 0.95,
        evidence: ["Rare AI citations", "Poor ranking in LLM responses"],
        recommendation: "Optimize content for AI consumption and citation",
      });
    }

    return insights.sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  private generateActionableTasks(report: NeuroSEOReport): ActionableTask[] {
    const tasks: ActionableTask[] = [];
    let taskCounter = 1;

    // Generate tasks based on insights and analysis results
    report.keyInsights.forEach((insight) => {
      if (insight.impact === "critical" || insight.impact === "high") {
        // Map categories to ActionableTask allowed categories
        let taskCategory: "content" | "technical" | "seo" | "competitive";
        if (insight.category === "competitive") {
          taskCategory = "competitive";
        } else if (insight.category === "trust") {
          taskCategory = "seo"; // Map trust issues to SEO
        } else {
          taskCategory = insight.category as "content" | "technical" | "seo";
        }

        tasks.push({
          id: `task-${taskCounter++}`,
          title: insight.recommendation,
          description: insight.description,
          category: taskCategory,
          priority: insight.impact === "critical" ? "urgent" : "high",
          estimatedEffort: this.estimateEffort(insight.category),
          estimatedImpact: Math.round(insight.confidence * 100),
          timeframe: this.estimateTimeframe(insight.category),
          dependencies: [],
          resources: this.generateTaskResources(insight.category),
        });
      }
    });

    // Add rewrite tasks if available
    if (
      report.rewriteRecommendations &&
      report.rewriteRecommendations.length > 0
    ) {
      report.rewriteRecommendations.forEach((rewrite) => {
        if (rewrite.recommendations.length > 0) {
          tasks.push({
            id: `task-${taskCounter++}`,
            title: "Implement Content Rewrite",
            description: `Apply ${rewrite.recommendations.length} content improvements`,
            category: "content",
            priority: "medium",
            estimatedEffort: "medium",
            estimatedImpact: 75,
            timeframe: "1-2 weeks",
            dependencies: [],
            resources: [
              {
                type: "template",
                title: "Content Rewrite Template",
                description: "Structured approach to content optimization",
              },
            ],
          });
        }
      });
    }

    return tasks.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private estimateEffort(category: string): "low" | "medium" | "high" {
    const effortMap: { [_key: string]: "low" | "medium" | "high"; } = {
      seo: "medium",
      content: "high",
      technical: "high",
      competitive: "medium",
      trust: "medium",
    };
    return effortMap[category] || "medium";
  }

  private estimateTimeframe(category: string): string {
    const timeframeMap: { [_key: string]: string; } = {
      seo: "2-4 weeks",
      content: "1-3 weeks",
      technical: "3-6 weeks",
      competitive: "2-4 weeks",
      trust: "4-8 weeks",
    };
    return timeframeMap[category] || "2-4 weeks";
  }

  private generateTaskResources(category: string): TaskResource[] {
    const resourceMap: { [_key: string]: TaskResource[]; } = {
      seo: [
        {
          type: "guide",
          title: "SEO Optimization Guide",
          description: "Comprehensive guide to technical and on-page SEO",
        },
      ],
      content: [
        {
          type: "template",
          title: "Content Optimization Template",
          description: "Structured approach to content improvement",
        },
      ],
      trust: [
        {
          type: "article",
          title: "E-A-T Optimization Best Practices",
          description:
            "Building expertise, authoritativeness, and trustworthiness",
        },
      ],
    };
    return resourceMap[category] || [];
  }

  private calculateOverallScore(report: NeuroSEOReport): number {
    const seoScore = this.calculateAverageSEOScore(report);
    const visibilityScore = this.calculateAverageVisibilityScore(report);
    const trustScore = this.calculateAverageTrustScore(report);
    const semanticScore = this.calculateAverageSemanticScore(report);

    // Weighted average with emphasis on visibility and trust
    const weightedScore =
      seoScore * 0.25 +
      visibilityScore * 0.35 +
      trustScore * 0.25 +
      semanticScore * 0.15;

    return Math.round(weightedScore);
  }

  // Public method to get usage statistics
  async getUsageStats(userId: string): Promise<any> {
    return await this.quotaManager.getUsageStats(userId);
  }

  // Public method to check quota before running analysis
  async checkAnalysisQuota(userId: string): Promise<UsageCheck> {
    return await this.quotaManager.checkUsageLimit(userId, "audit");
  }
}
