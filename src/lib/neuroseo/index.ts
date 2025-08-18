/**
 * NeuroSEO™ Suite - Main orchestrator for all NeuroSEO™ components
 * Part of RankPilot Studio
 */

import { UsageQuotaManager as ClientUsageQuotaManager, type UsageCheck } from "../usage-quota";
import { getLogger } from '@/lib/logging/app-logger';
import { adminDb } from "../firebase-admin"; // Server-side Firestore (lazy in API route runtime)
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
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
import { recordSubtoolRun } from "@/lib/metrics/ai-usage";

// Canonical collections & sampling constants (colocated for clarity)
const CANONICAL_COLLECTION = 'neuroSeoAnalyses';
const LEGACY_COLLECTIONS = ['neuroseo-analyses'];
const AGGREGATION_SAMPLE_LIMIT = 50; // bounded for performance

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
  request: NeuroSEOAnalysisRequest;
  crawlResults: CrawlResult[];
  semanticAnalysis: SemanticAnalysisResult[];
  visibilityAnalysis: VisibilityReport[];
  trustAnalysis: TrustReport[];
  engagementAnalysis?: Array<{
    url: string;
    engagementScore: number; // 0-100
    leadPotentialScore: number; // 0-100
    factors: string[];
  }>;
  rewriteRecommendations?: RewriteAnalysis[];
  overallScore: number;
  keyInsights: KeyInsight[];
  actionableTasks: ActionableTask[];
  competitivePositioning?: CompetitivePositioning;
  quotaUsage: UsageCheck;
  trustMeta?: {
    modelTag: string;
    generatedAt: string;
    dataIntegrity: 'simulated' | 'measured';
    deterministic: boolean;
    notes?: string[];
  };
  trends?: {
    seoAvg?: number[];              // recent N historical averages
    visibilityAvg?: number[];
    trustAvg?: number[];
    engagementAvg?: number[];
    overallScore?: number[];
  };
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
  keywordGap?: {
    missingKeywords: string[];            // High-value competitor tokens we lack
    overlapKeywords: string[];            // Shared tokens (context baseline)
    competitorExclusiveKeywords: string[];// Additional competitor-only tokens
    opportunities?: Array<{
      term: string;
      opportunityScore: number;          // 0-100 derived score
      competitorsUsing: number;          // How many competitors use it
      category: 'core' | 'emerging' | 'niche';
    }>;
  };
}

// Lightweight server-safe quota manager stub (avoids client Firestore SDK on server)
class ServerQuotaStub {
  async checkUsageLimit(_userId: string, _type: string) {
    return { allowed: true, remainingQuota: 9999, remaining: 9999, limit: 0, resetDate: new Date() } as UsageCheck;
  }
  async incrementUsage(_userId: string, _type: string, _inc: number) { /* no-op */ }
  async getUsageStats(_userId: string) { return { used: 0, limit: 0 }; }
}

const quotaManagerFactory = () => {
  if (typeof window === 'undefined') {
    return new ServerQuotaStub() as unknown as ClientUsageQuotaManager;
  }
  return new ClientUsageQuotaManager();
};

export class NeuroSEOSuite {
  private neuralCrawler: NeuralCrawler;
  private semanticEngine: SemanticMap;
  private visibilityEngine: AIVisibilityEngine;
  private trustEngine: TrustBlockEngine;
  private rewriteEngine: RewriteGenEngine;
  private quotaManager: ClientUsageQuotaManager | ServerQuotaStub;
  // Cache the last fetched competitor contents for keyword gap analysis
  private lastCompetitorContents: Array<{ url: string; content: string; }> | null = null;
  // Simple in-memory cache (process lifetime). Could be swapped for Redis.
  private static analysisCache: Map<string, { timestamp: number; report: NeuroSEOReport; }> = new Map();
  private static CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

  // Firestore collection naming normalization shim
  // Canonical: "neuroSeoAnalyses" (top-level) with documents: { userId, createdAt, ...report }
  // Legacy variants detected: "neuroseo-analyses" and nested user doc collections
  // Migration strategy: write to canonical; read legacy if canonical miss (implemented in fetchCorpusStats)

  constructor() {
    this.neuralCrawler = new NeuralCrawler();
    this.semanticEngine = new SemanticMap();
    this.visibilityEngine = new AIVisibilityEngine();
    this.trustEngine = new TrustBlockEngine();
    this.rewriteEngine = new RewriteGenEngine();
    this.quotaManager = quotaManagerFactory();
  }

  async runAnalysis(request: NeuroSEOAnalysisRequest): Promise<NeuroSEOReport> {
    const logger = getLogger('neuroseo-suite').withTrace();
    const reportId = `neuro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cacheKey = this.buildCacheKey(request);
    const cached = NeuroSEOSuite.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < NeuroSEOSuite.CACHE_TTL_MS) {
      logger.info('analysis.cache.hit', { cacheKey, urlCount: request.urls.length, type: request.analysisType });
      return { ...cached.report, quotaUsage: await this.quotaManager.checkUsageLimit(request.userId, "report") };
    }

    // Check quota before proceeding
    let quotaCheck = await this.quotaManager.checkUsageLimit(
      request.userId,
      "report"
    );
    // Graceful degradation: if quota cannot be verified (e.g., server-side Firestore client SDK issues), proceed with a permissive stub
    if (!quotaCheck.allowed && /Unable to verify usage quota/i.test(quotaCheck.reason || '')) {
      logger.degraded('quota.verification.degraded', { reason: quotaCheck.reason });
      quotaCheck = { ...quotaCheck, allowed: true, remainingQuota: quotaCheck.remainingQuota ?? 1, remaining: quotaCheck.remaining ?? 1, limit: quotaCheck.limit || 0 } as UsageCheck;
    } else if (!quotaCheck.allowed) {
      throw new Error(`Quota exceeded: ${quotaCheck.reason}`);
    }

    try {
      // Record quota usage
      await this.quotaManager.incrementUsage(request.userId, "report", 1);

      const report: NeuroSEOReport = {
        id: reportId,
        timestamp: new Date().toISOString(),
        request,
        crawlResults: [],
        semanticAnalysis: [],
        visibilityAnalysis: [],
        trustAnalysis: [],
        engagementAnalysis: [],
        overallScore: 0,
        keyInsights: [],
        actionableTasks: [],
        quotaUsage: quotaCheck,
        trustMeta: {
          modelTag: 'neuroseo-suite:phase0',
          generatedAt: new Date().toISOString(),
          dataIntegrity: 'simulated',
          deterministic: true,
          notes: [
            'Phase 0/2 transition: simulated core scores, crawler now capturing measured technical metrics',
            'Upgrade path: progressively swap simulated visibility/trust with measured signals'
          ]
        },
        trends: {}
      };

      // Phase 0: Corpus statistics (for competitor realism & scoring baselines)
      const corpusStats = await this.fetchCorpusStats();

      // Phase 1: Neural Crawling
      logger.info('phase.crawl.start', { urlCount: request.urls.length });
      report.crawlResults = await this.runCrawlPhase(request.urls);
      recordSubtoolRun('neural_crawler');

      // Phase 2: Semantic Analysis (activated)
      logger.info('phase.semantic.start', { crawlResults: report.crawlResults.length, keywords: request.targetKeywords.length });
      report.semanticAnalysis = await this.runSemanticPhase(
        report.crawlResults,
        request.targetKeywords,
        request.competitorUrls
      );
      recordSubtoolRun('semantic_map');

      // Phase 3: AI Visibility Analysis (may use corpusStats to adjust scoring later)
      logger.info('phase.visibility.start', { urlCount: request.urls.length });
      report.visibilityAnalysis = await this.runVisibilityPhase(
        request.urls,
        request.targetKeywords,
        request.competitorUrls
      );
      recordSubtoolRun('ai_visibility');

      // Phase 4: Trust Analysis
      logger.info('phase.trust.start', { crawlResults: report.crawlResults.length });
      report.trustAnalysis = await this.runTrustPhase(
        report.crawlResults,
        request.competitorUrls
      );
      recordSubtoolRun('trust_block');

      // Phase 5: Content Rewrite Recommendations (if content-focused)
      if (
        request.analysisType === "content-focused" ||
        request.analysisType === "comprehensive"
      ) {
        logger.info('phase.rewrite.start', { pages: report.crawlResults.length });
        report.rewriteRecommendations =
          await this.generateRewriteRecommendations(
            report.crawlResults,
            request.targetKeywords
          );
        recordSubtoolRun('rewrite_gen');
      }

      // Phase 3: Engagement & Lead Potential (applies to all types in Phase 3 rollout)
      logger.info('phase.engagement.start', { pages: report.crawlResults.length });
      report.engagementAnalysis = this.computeEngagementAnalysis(report.crawlResults);

      // Phase 6: Competitive Positioning (if competitive analysis requested)
      if (
        request.analysisType === "competitive" ||
        request.analysisType === "comprehensive"
      ) {
        logger.info('phase.competitive.start', { competitors: (request.competitorUrls || []).length });
        report.competitivePositioning =
          await this.analyzeCompetitivePositioning(
            report,
            request.competitorUrls || [],
            corpusStats
          );
      }

      // Phase 7: Generate Insights and Tasks
      logger.info('phase.insights.start');
      report.keyInsights = this.generateKeyInsights(report);
      report.actionableTasks = this.generateActionableTasks(report);
      report.overallScore = this.calculateOverallScore(report);

      // Phase: Trend tracking (append recent metrics)
      try {
        const historical = await this.fetchRecentMetricHistory(report.request.userId, 9); // get up to 9 prior => plus current = 10
        const append = (arr: number[], val: number) => [...arr.slice(-9), val];
        report.trends = {
          seoAvg: append(historical.seoAvg, this.calculateAverageSEOScore(report)),
          visibilityAvg: append(historical.visibilityAvg, this.calculateAverageVisibilityScore(report)),
          trustAvg: append(historical.trustAvg, this.calculateAverageTrustScore(report)),
          engagementAvg: append(historical.engagementAvg, this.calculateAverageEngagementScore(report)),
          overallScore: append(historical.overallScore, report.overallScore)
        };
      } catch (e) {
        const trendErr = (e as any && typeof (e as any).message === 'string') ? (e as any).message : 'trend-assembly-failed';
        logger.degraded('trend.assembly.degraded', { error: trendErr });
      }

      // Attach schema version for downstream validation & migrations
      (report as any).schemaVersion = SCHEMA_VERSION;

      // Persist report (best-effort, non-blocking failure)
      this.persistReport(report).catch(e => {
        const msg = (e as any && typeof (e as any).message === 'string') ? (e as any).message : 'persist-failed';
        logger.degraded('persistence.failed', { error: msg });
      });
      logger.info('analysis.complete', { overallScore: report.overallScore, crawlResults: report.crawlResults.length });
      NeuroSEOSuite.analysisCache.set(cacheKey, { timestamp: Date.now(), report });
      return report;
    } catch (error) {
      const msg = (error as any && typeof (error as any).message === 'string') ? (error as any).message : 'analysis-failed';
      logger.error('analysis.failed', { error: msg });
      throw error as Error;
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
      } catch (error) {
        getLogger('neuroseo-suite').warn('phase.crawl.item.failed', { url, error: (error as Error)?.message });
      }
    }

    return crawlResults;
  }

  private async runSemanticPhase(
    crawlResults: CrawlResult[],
    targetKeywords: string[],
    competitorUrls?: string[]
  ): Promise<SemanticAnalysisResult[]> {
    const semanticResults: SemanticAnalysisResult[] = [];
    // Fetch competitor content (throttled) if provided
    let competitorData: Array<{ url: string; content: string; }> = [];
    if (competitorUrls && competitorUrls.length) {
      try {
        competitorData = await this.fetchCompetitorContents(competitorUrls.slice(0, 5)); // limit to 5 for performance
        this.lastCompetitorContents = competitorData;
      } catch (e) {
        getLogger('neuroseo-suite').warn('phase.semantic.competitor.fetch.failed', { error: (e as Error)?.message });
      }
    }
    for (const crawlResult of crawlResults) {
      try {
        const semanticReport = await this.semanticEngine.analyzeContent(
          crawlResult.content || '',
          crawlResult.title || 'Untitled',
          targetKeywords,
          competitorData
        );
        semanticResults.push(semanticReport);
      } catch (error) {
        getLogger('neuroseo-suite').warn('phase.semantic.item.failed', { url: crawlResult.url, error: (error as Error)?.message });
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
      } catch (error) {
        getLogger('neuroseo-suite').warn('phase.visibility.item.failed', { url, error: (error as Error)?.message });
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
      } catch (error) {
        getLogger('neuroseo-suite').warn('phase.trust.item.failed', { url: crawlResult.url, error: (error as Error)?.message });
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
              value: true,
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
      } catch (error) {
        getLogger('neuroseo-suite').warn('phase.rewrite.item.failed', { url: crawlResult.url, error: (error as Error)?.message });
      }
    }

    return rewriteResults;
  }

  private async analyzeCompetitivePositioning(
    report: NeuroSEOReport,
    competitorUrls: string[],
    corpusStats: { avgSeo: number; avgVisibility: number; avgTrust: number; avgSemantic: number; }
  ): Promise<CompetitivePositioning> {
    const ourScores = {
      seo: this.calculateAverageSEOScore(report),
      visibility: this.calculateAverageVisibilityScore(report),
      trust: this.calculateAverageTrustScore(report),
      semantic: this.calculateAverageSemanticScore(report),
    };
    // Derive competitor baselines from corpus averages with slight variance
    const competitorScores = competitorUrls.map((url) => ({
      url,
      seo: this.jitter(corpusStats.avgSeo, 5, 15),
      visibility: this.jitter(corpusStats.avgVisibility, 5, 20),
      trust: this.jitter(corpusStats.avgTrust, 3, 10),
      semantic: this.jitter(corpusStats.avgSemantic, 5, 15),
    }));
    const ourOverallScore = (ourScores.seo + ourScores.visibility + ourScores.trust + ourScores.semantic) / 4;
    const competitorOverallScores = competitorScores.map(c => (c.seo + c.visibility + c.trust + c.semantic) / 4);
    const betterCompetitors = competitorOverallScores.filter(score => score > ourOverallScore).length;
    const ranking = betterCompetitors + 1;
    const positioning: CompetitivePositioning = {
      overallRanking: ranking,
      totalCompetitors: competitorUrls.length + 1,
      strengths: this.identifyStrengths(ourScores, competitorScores),
      weaknesses: this.identifyWeaknesses(ourScores, competitorScores),
      opportunities: this.identifyOpportunities(report),
      threats: this.identifyThreats(competitorScores),
      recommendations: this.generateCompetitiveRecommendations(ourScores, competitorScores),
    };

    // Phase 1 keyword gap analysis (best-effort; silent degradation)
    try {
      if (competitorUrls.length && this.lastCompetitorContents && this.lastCompetitorContents.length) {
        positioning.keywordGap = this.computeKeywordGap(report, this.lastCompetitorContents);
      }
    } catch (e) {
      getLogger('neuroseo-suite').degraded('phase.competitive.keywordGap.failed', { error: (e as Error)?.message });
    }

    return positioning;
  }

  private computeKeywordGap(
    report: NeuroSEOReport,
    competitorContents: Array<{ url: string; content: string; }>
  ): CompetitivePositioning['keywordGap'] {
    const tokenize = (txt: string) => (txt.toLowerCase().match(/[a-z]{4,18}/g) || []);
    const ourText = report.crawlResults.map(r => r.content || '').join(' ');
    const ourTokens = tokenize(ourText);
    const ourSet = new Set(ourTokens);

    const freq: Record<string, number> = {};
    for (const comp of competitorContents) {
      const tokens = new Set(tokenize(comp.content));
      tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    }

    const competitorExclusive = Object.entries(freq)
      .filter(([tok, c]) => !ourSet.has(tok) && (c >= 2 || tok.length >= 10))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 50)
      .map(([tok]) => tok);

    // Deterministic selection using hash of token + report id
    const hash = (s: string) => {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      return h >>> 0;
    };
    const missingKeywords = competitorExclusive
      .map(k => ({ k, h: hash(k + '::' + report.id) }))
      .sort((a, b) => a.h - b.h)
      .slice(0, 15)
      .map(o => o.k);

    const overlap: string[] = [];
    Object.keys(freq).forEach(tok => { if (ourSet.has(tok)) overlap.push(tok); });
    const overlapKeywords = overlap.sort().slice(0, 40);

    // Construct opportunity objects (deterministic ordering by score then hash)
    const competitorCount = Math.max(1, competitorContents.length);
    const opportunities = competitorExclusive.map(term => {
      const competitorsUsing = freq[term] || 0;
      const coverageRatio = competitorsUsing / competitorCount; // 0..1
      // Score weights: coverage 55%, term length richness 25%, rarity (inverse of our presence) 20%
      const lengthWeight = Math.min(term.length, 12) / 12; // 0..1
      const opportunityScore = Math.round(
        coverageRatio * 55 + lengthWeight * 25 + 20 // we don't use rarity since we already exclude our tokens; constant baseline 20
      );
      let category: 'core' | 'emerging' | 'niche';
      if (coverageRatio >= 0.6) category = 'core';
      else if (coverageRatio >= 0.3) category = 'emerging';
      else category = 'niche';
      return { term, opportunityScore: Math.min(100, opportunityScore), competitorsUsing, category };
    });
    const oppHash = (s: string) => {
      let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0;
    };
    opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore || (oppHash(a.term) - oppHash(b.term)));
    const topOpportunities = opportunities.slice(0, 25);

    return {
      missingKeywords,
      overlapKeywords,
      competitorExclusiveKeywords: competitorExclusive.slice(0, 40),
      opportunities: topOpportunities,
    };
  }

  private calculateAverageSEOScore(report: NeuroSEOReport): number {
    if (report.crawlResults.length === 0) return 0;
    return Math.round(
      report.crawlResults.reduce(
        (sum, result) => sum + (result.seoMetrics?.overallScore || 0),
        0
      ) / report.crawlResults.length
    );
  }

  private calculateAverageVisibilityScore(report: NeuroSEOReport): number {
    if (report.visibilityAnalysis.length === 0) return 0;
    return Math.round(
      report.visibilityAnalysis.reduce(
        (sum, result) => sum + result.metrics.overallVisibilityScore,
        0
      ) / report.visibilityAnalysis.length
    );
  }

  private calculateAverageTrustScore(report: NeuroSEOReport): number {
    if (report.trustAnalysis.length === 0) return 0;
    return Math.round(
      report.trustAnalysis.reduce(
        (sum, result) => sum + result.metrics.overallEATScore,
        0
      ) / report.trustAnalysis.length
    );
  }

  private calculateAverageSemanticScore(report: NeuroSEOReport): number {
    if (!report.semanticAnalysis.length) return 0;
    return Math.round(
      report.semanticAnalysis.reduce(
        (sum, result) => sum + (result.overallRelevanceScore || 0),
        0
      ) / report.semanticAnalysis.length
    );
  }

  private identifyStrengths(ourScores: { seo: number; visibility: number; trust: number; semantic: number; }, competitorScores: Array<{ seo: number; visibility: number; trust: number; semantic: number; }>): string[] {
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
    ourScores: { seo: number; visibility: number; trust: number; semantic: number; },
    competitorScores: Array<{ seo: number; visibility: number; trust: number; semantic: number; }>
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

  private identifyThreats(competitorScores: Array<{ seo: number; visibility: number; trust: number; semantic: number; }>): string[] {
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
    ourScores: { seo: number; visibility: number; trust: number; semantic: number; },
    competitorScores: Array<{ seo: number; visibility: number; trust: number; semantic: number; }>
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

    // Engagement insight
    if (report.engagementAnalysis && report.engagementAnalysis.length) {
      const avgEngagement = this.calculateAverageEngagementScore(report);
      if (avgEngagement < 65) {
        insights.push({
          category: "content",
          title: "User Engagement Risk",
          description: `Average engagement score ${avgEngagement} suggests thin or slow content diminishing conversions`,
          impact: avgEngagement < 50 ? "critical" : "high",
          confidence: 0.8,
          evidence: ["Low dwell proxies (word count / authorship signals)", "Page speed penalties"],
          recommendation: "Improve depth, reduce load time, and strengthen author credibility elements",
        });
      }
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

    // Engagement remediation tasks
    if (report.engagementAnalysis && report.engagementAnalysis.length) {
      const lowPages = report.engagementAnalysis.filter(e => e.engagementScore < 60).slice(0, 5);
      lowPages.forEach(lp => {
        tasks.push({
          id: `task-${taskCounter++}`,
          title: `Boost Engagement: ${lp.url.replace(/^https?:\/\//, '').slice(0, 40)}`,
          description: `Engagement ${lp.engagementScore}. Improve depth, speed & credibility factors (${lp.factors.slice(0, 3).join(', ')})`,
          category: "content",
          priority: lp.engagementScore < 45 ? "urgent" : "high",
          estimatedEffort: "medium",
          estimatedImpact: 70,
          timeframe: "2-3 weeks",
          dependencies: [],
          resources: [
            { type: 'guide', title: 'Engagement Optimization Playbook', description: 'Checklist for depth, speed & trust improvements' }
          ]
        });
      });
    }

    return tasks.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private estimateEffort(category: string): "low" | "medium" | "high" {
    const effortMap: { [key: string]: "low" | "medium" | "high"; } = {
      seo: "medium",
      content: "high",
      technical: "high",
      competitive: "medium",
      trust: "medium",
    };
    return effortMap[category] || "medium";
  }

  private estimateTimeframe(category: string): string {
    const timeframeMap: { [key: string]: string; } = {
      seo: "2-4 weeks",
      content: "1-3 weeks",
      technical: "3-6 weeks",
      competitive: "2-4 weeks",
      trust: "4-8 weeks",
    };
    return timeframeMap[category] || "2-4 weeks";
  }

  private generateTaskResources(category: string): TaskResource[] {
    const resourceMap: { [key: string]: TaskResource[]; } = {
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
    const engagementScore = this.calculateAverageEngagementScore(report);

    // Phase 2 measured adjustments: penalize canonical mismatch & very low word count pages
    let technicalPenalty = 0;
    try {
      interface CrawlResultLike { technicalData?: { canonicalMismatch?: boolean; wordCount?: number }; }
      const crawlCount = report.crawlResults.length || 1;
      const mismatches = report.crawlResults.filter(r => (r as CrawlResultLike).technicalData?.canonicalMismatch).length;
      const avgWordCount = report.crawlResults.reduce((s, r) => s + (((r as CrawlResultLike).technicalData?.wordCount) || 0), 0) / crawlCount;
      if (mismatches > 0) technicalPenalty += Math.min(10, mismatches * 2); // up to -10
      if (avgWordCount < 400) technicalPenalty += 8; // thin content penalty
      else if (avgWordCount < 700) technicalPenalty += 4;
    } catch {/* silent */ }

    // Weighted average with emphasis on visibility and trust
    const weightedScore =
      seoScore * 0.21 +
      visibilityScore * 0.32 +
      trustScore * 0.22 +
      semanticScore * 0.13 +
      engagementScore * 0.12 +
      5; // base bias

    return Math.max(0, Math.min(100, Math.round(weightedScore - technicalPenalty)));
  }

  // Public method to get usage statistics
  async getUsageStats(userId: string): Promise<unknown> {
    return await this.quotaManager.getUsageStats(userId);
  }

  // Public method to check quota before running analysis
  async checkAnalysisQuota(userId: string): Promise<UsageCheck> {
    return await this.quotaManager.checkUsageLimit(userId, "audit");
  }

  private buildCacheKey(request: NeuroSEOAnalysisRequest): string {
    return JSON.stringify({
      urls: request.urls.slice().sort(),
      kw: request.targetKeywords.slice().sort(),
      type: request.analysisType,
      plan: request.userPlan,
    });
  }

  private computeEngagementAnalysis(crawlResults: CrawlResult[]): NeuroSEOReport['engagementAnalysis'] {
    const analysis: Required<NonNullable<NeuroSEOReport['engagementAnalysis']>> = [];
    for (const c of crawlResults) {
      const tech = ((c as any).technicalData || {}) as { loadTime?: number; wordCount?: number; canonicalMismatch?: boolean };
      const authorship = ((c as any).authorshipSignals || {}) as { hasAuthorBio?: boolean; socialLinks?: unknown[] };
      const factors: string[] = [];
      // Engagement heuristics
      const wordCount = tech.wordCount || 0;
      let score = 100;
      if (tech.loadTime) {
        const loadPenalty = Math.min(25, Math.floor(tech.loadTime / 200));
        if (loadPenalty > 0) { score -= loadPenalty; factors.push(`LoadPenalty-${loadPenalty}`); }
      }
      if (wordCount < 800) {
        const depthPenalty = wordCount < 400 ? 20 : 10;
        score -= depthPenalty; factors.push('LowDepth');
      }
      if (!authorship.hasAuthorBio) { score -= 5; factors.push('NoAuthorBio'); }
      if (!(authorship.socialLinks || []).length) { score -= 3; factors.push('NoSocialProof'); }
      if (tech.canonicalMismatch) { score -= 4; factors.push('CanonicalMismatch'); }
      score = Math.max(0, Math.min(100, score));
      // Lead potential: rely on authorship + depth + entity count if available
      const entityCount = (((c as any).semanticClassification?.keyEntities) || []).length;
      let leadPotential = 50 + Math.min(25, Math.floor(entityCount * 2.5));
      if (wordCount > 1200) leadPotential += 10;
      if (authorship.hasAuthorBio) leadPotential += 5;
      leadPotential = Math.max(0, Math.min(100, leadPotential));
      analysis.push({ url: c.url, engagementScore: score, leadPotentialScore: leadPotential, factors });
    }
    return analysis;
  }

  private calculateAverageEngagementScore(report: NeuroSEOReport): number {
    if (!report.engagementAnalysis || !report.engagementAnalysis.length) return 0;
    return Math.round(report.engagementAnalysis.reduce((s, e) => s + e.engagementScore, 0) / report.engagementAnalysis.length);
  }

  private jitter(base: number, minDelta: number, maxDelta: number): number {
    const delta = Math.random() * (maxDelta - minDelta) + minDelta;
    const sign = Math.random() > 0.5 ? 1 : -1;
    return Math.max(0, Math.min(100, Math.round(base + sign * delta)));
  }

  private async fetchCorpusStats(): Promise<{ avgSeo: number; avgVisibility: number; avgTrust: number; avgSemantic: number; }> {
    try {
      // Query canonical collection first
      const snap = await adminDb.collection(CANONICAL_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(AGGREGATION_SAMPLE_LIMIT)
        .get();
      const docs: any[] = [];
      snap.forEach(d => docs.push(d.data()));
      if (docs.length === 0) {
        // Attempt legacy fallbacks
        for (const legacy of LEGACY_COLLECTIONS) {
          const lsnap = await adminDb.collection(legacy)
            .orderBy('createdAt', 'desc')
            .limit(AGGREGATION_SAMPLE_LIMIT)
            .get();
          if (!lsnap.empty) {
            lsnap.forEach(d => docs.push(d.data()));
            break;
          }
        }
      }
      if (docs.length === 0) {
        // Fallback to cache-derived stats
        const values = Array.from(NeuroSEOSuite.analysisCache.values()).map(v => v.report);
        if (values.length === 0) {
          return { avgSeo: 72, avgVisibility: 55, avgTrust: 78, avgSemantic: 64 };
        }
        const avgCache = (arr: number[]) => Math.round(arr.reduce((s, c) => s + c, 0) / arr.length);
        return {
          avgSeo: avgCache(values.map(r => this.calculateAverageSEOScore(r))),
          avgVisibility: avgCache(values.map(r => this.calculateAverageVisibilityScore(r))),
          avgTrust: avgCache(values.map(r => this.calculateAverageTrustScore(r))),
          avgSemantic: avgCache(values.map(r => this.calculateAverageSemanticScore(r))),
        };
      }
      // Compute averages from persisted docs (pre-computed fields if present; else derive heuristics)
      let seoTotal = 0, visTotal = 0, trustTotal = 0, semTotal = 0, count = 0;
      for (const d of docs) {
        seoTotal += d.seoAvg || d.overallScore || 0;
        visTotal += d.visibilityAvg || d.avgVisibilityScore || d.overallScore || 0;
        trustTotal += d.trustAvg || d.avgTrustScore || d.overallScore || 0;
        semTotal += d.semanticAvg || d.avgSemanticScore || Math.round((d.overallScore || 0) * 0.6);
        count++;
      }
      if (!count) return { avgSeo: 72, avgVisibility: 55, avgTrust: 78, avgSemantic: 64 };
      return {
        avgSeo: Math.round(seoTotal / count),
        avgVisibility: Math.round(visTotal / count),
        avgTrust: Math.round(trustTotal / count),
        avgSemantic: Math.round(semTotal / count),
      };
    } catch (e) {
      getLogger('neuroseo-suite').degraded('corpus.stats.fallback', { error: (e as Error)?.message });
      return { avgSeo: 72, avgVisibility: 55, avgTrust: 78, avgSemantic: 64 };
    }
  }

  // --- Persistence & Aggregation Helpers -------------------------------------------------
  private async persistReport(report: NeuroSEOReport): Promise<void> {
    try {
      const doc: unknown = {
        userId: report.request.userId,
        createdAt: FieldValue.serverTimestamp(),
        urls: report.request.urls,
        targetKeywords: report.request.targetKeywords,
        competitorUrls: report.request.competitorUrls || [],
        analysisType: report.request.analysisType,
        overallScore: report.overallScore,
        seoAvg: this.calculateAverageSEOScore(report),
        visibilityAvg: this.calculateAverageVisibilityScore(report),
        trustAvg: this.calculateAverageTrustScore(report),
        semanticAvg: this.calculateAverageSemanticScore(report),
        engagementAvg: this.calculateAverageEngagementScore(report),
        avgLoadTime: Math.round((report.crawlResults.reduce((s, r) => s + (r.technicalData?.loadTime || 0), 0) / (report.crawlResults.length || 1)) || 0),
        avgWordCount: Math.round((report.crawlResults.reduce((s, r) => s + (r.technicalData?.wordCount || 0), 0) / (report.crawlResults.length || 1)) || 0),
        canonicalMismatchCount: report.crawlResults.filter(r => r.technicalData?.canonicalMismatch).length,
        keyInsights: report.keyInsights.slice(0, 25),
        actionableTasks: report.actionableTasks.slice(0, 50),
        competitive: report.competitivePositioning || null,
        schemaVersion: SCHEMA_VERSION,
        // Lightweight reference to detailed arrays (could be moved to sub-collections later)
        crawlResultCount: report.crawlResults.length,
        visibilityResultCount: report.visibilityAnalysis.length,
        trustResultCount: report.trustAnalysis.length,
        semanticResultCount: report.semanticAnalysis.length,
        trends: report.trends || null,
      };
      await adminDb.collection(CANONICAL_COLLECTION).doc(report.id).set(doc as any, { merge: true });
      // Optional: legacy mirror (omit for now to reduce writes) -> can be enabled if needed
    } catch (e) {
      const msg = (e as any && typeof (e as any).message === 'string') ? (e as any).message : 'persist-failed';
      getLogger('neuroseo-suite').degraded('persistence.report.failed', { error: msg });
    }
  }

  private async fetchRecentMetricHistory(userId: string, limit: number): Promise<{ seoAvg: number[]; visibilityAvg: number[]; trustAvg: number[]; engagementAvg: number[]; overallScore: number[]; }> {
    try {
      const snap = await adminDb.collection(CANONICAL_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      const seoAvg: number[] = [], visibilityAvg: number[] = [], trustAvg: number[] = [], engagementAvg: number[] = [], overallScore: number[] = [];
      snap.forEach(d => {
        const data: any = d.data();
        if (typeof data?.seoAvg === 'number') seoAvg.push(data.seoAvg);
        if (typeof data?.visibilityAvg === 'number') visibilityAvg.push(data.visibilityAvg);
        if (typeof data?.trustAvg === 'number') trustAvg.push(data.trustAvg);
        if (typeof data?.engagementAvg === 'number') engagementAvg.push(data.engagementAvg);
        if (typeof data?.overallScore === 'number') overallScore.push(data.overallScore);
      });
      return { seoAvg: seoAvg.reverse(), visibilityAvg: visibilityAvg.reverse(), trustAvg: trustAvg.reverse(), engagementAvg: engagementAvg.reverse(), overallScore: overallScore.reverse() };
    } catch (e) {
      return { seoAvg: [], visibilityAvg: [], trustAvg: [], engagementAvg: [], overallScore: [] };
    }
  }

  // Fetch competitor pages with simple concurrency control
  private async fetchCompetitorContents(urls: string[], concurrency = 3): Promise<Array<{ url: string; content: string; }>> {
    const results: Array<{ url: string; content: string; }> = [];
    let index = 0;
    const worker = async () => {
      while (index < urls.length) {
        const current = urls[index++];
        try {
          const crawl = await this.neuralCrawler.crawl(current, { includeImages: false, followRedirects: true, extractSchema: false, analyzeAuthorship: false, timeout: 20000 });
          results.push({ url: current, content: crawl.content || '' });
        } catch (e) {
          const msg = (e as any && typeof (e as any).message === 'string') ? (e as any).message : 'crawl-failed';
          getLogger('neuroseo-suite').warn('phase.semantic.competitor.single.failed', { url: current, error: msg });
        }
      }
    };
    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  // Public cache invalidation (manual or automated)
  static purgeCache(keys?: string[]): number {
    if (!keys || !keys.length) {
      const size = NeuroSEOSuite.analysisCache.size;
      NeuroSEOSuite.analysisCache.clear();
      return size;
    }
    let removed = 0;
    for (const k of keys) {
      if (NeuroSEOSuite.analysisCache.delete(k)) removed++;
    }
    return removed;
  }
}

// ---------------- Schema Definition & Validation -------------------------
export const SCHEMA_VERSION = 1;
export const NeuroSEOReportSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  request: z.object({
    urls: z.array(z.string()).min(1),
    targetKeywords: z.array(z.string()),
    competitorUrls: z.array(z.string()).optional(),
    analysisType: z.enum(["comprehensive", "seo-focused", "content-focused", "competitive"]),
    userPlan: z.string(),
    userId: z.string(),
  }),
  crawlResults: z.array(z.any()),
  semanticAnalysis: z.array(z.any()),
  visibilityAnalysis: z.array(z.any()),
  trustAnalysis: z.array(z.any()),
  engagementAnalysis: z.array(z.any()).optional(),
  rewriteRecommendations: z.array(z.any()).optional(),
  overallScore: z.number().min(0).max(100),
  keyInsights: z.array(z.any()),
  actionableTasks: z.array(z.any()),
  competitivePositioning: z.any().optional(),
  quotaUsage: z.any(),
  schemaVersion: z.number().optional(),
  trustMeta: z.object({
    modelTag: z.string(),
    generatedAt: z.string(),
    dataIntegrity: z.enum(['simulated', 'measured']),
    deterministic: z.boolean(),
    notes: z.array(z.string()).optional()
  }).optional(),
  trends: z.object({
    seoAvg: z.array(z.number()).optional(),
    visibilityAvg: z.array(z.number()).optional(),
    trustAvg: z.array(z.number()).optional(),
    engagementAvg: z.array(z.number()).optional(),
    overallScore: z.array(z.number()).optional(),
  }).optional(),
});
