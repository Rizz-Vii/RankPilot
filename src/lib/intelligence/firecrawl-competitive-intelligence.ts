/**
 * Firecrawl Competitive Intelligence System
 * Implements Priority 2 Enterprise Features from DevReady Phase 3
 *
 * Features:
 * - Automated competitor tracking with Firecrawl MCP
 * - SEO competitive analysis and benchmarking
 * - Content gap analysis and opportunity identification
 * - Automated competitive reporting and alerts
 * - Integration with dashboard and workflow systems
 */

import { EventEmitter } from "events";

/**
 * Crawl response/page structures (simplified from Firecrawl MCP expected shape)
 */
interface CrawledPageMetadata {
  title?: string;
  description?: string;
  // Allow additional metadata fields without forcing unknown everywhere
  [key: string]: unknown;
}

interface CrawledPage {
  markdown?: string;
  html?: string;
  metadata?: CrawledPageMetadata;
}

interface CrawlResponse {
  data: CrawledPage[];
  [key: string]: unknown;
}

export interface CompetitorAggregatedMetrics {
  // Selected numeric summary metrics we compute/track
  seoScore?: number;
  totalPages?: number;
  coreWebVitals?: {
    lcp: number;
    cls: number;
    fid: number;
    overall: number;
  };
  pageSpeed?: {
    desktop: number;
    mobile: number;
  };
  // Bag of additional metrics without strict typing yet
  [key: string]: unknown;
}

export interface CompetitorProfile {
  id: string;
  domain: string;
  name: string;
  description?: string;
  industry: string;
  targetKeywords: string[];
  trackingConfig: {
    crawlFrequency: "daily" | "weekly" | "monthly";
    pages: string[];
    metrics: CompetitorMetric[];
    alertThresholds: Record<string, number>;
  };
  lastAnalysis?: {
    timestamp: number;
    status: "success" | "error" | "partial";
    metrics: CompetitorAggregatedMetrics;
    changes: CompetitorChange[];
  };
  metadata: {
    created: number;
    updated: number;
    analysisCount: number;
    userId: string;
  };
}

export interface CompetitorMetric {
  name: string;
  type: "seo" | "content" | "technical" | "performance" | "social";
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: "increase" | "decrease" | "stable";
  timestamp: number;
  source: string;
}

export interface CompetitorChange {
  type: "ranking" | "content" | "technical" | "performance" | "social";
  description: string;
  impact: "high" | "medium" | "low";
  metric: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
  confidence: number; // 0-1
}

export interface CompetitiveAnalysisReport {
  id: string;
  userId: string;
  competitors: string[];
  analysisType:
    | "overview"
    | "keyword-gap"
    | "content-gap"
    | "technical"
    | "comprehensive";
  timeframe: {
    start: number;
    end: number;
  };
  findings: {
    opportunities: CompetitiveOpportunity[];
    threats: CompetitiveThreat[];
    insights: CompetitiveInsight[];
    recommendations: CompetitiveRecommendation[];
  };
  data: {
    keywordAnalysis?: KeywordCompetitionData;
    contentAnalysis?: ContentCompetitionData;
    technicalAnalysis?: TechnicalCompetitionData;
    performanceAnalysis?: PerformanceCompetitionData;
  };
  metadata: {
    generated: number;
    format: "json" | "pdf" | "html";
    size: number;
    processingTime: number;
  };
}

export interface CompetitiveOpportunity {
  type: "keyword" | "content" | "technical" | "link" | "performance";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: number; // 1-10 scale
  effort: "low" | "medium" | "high";
  competitorData: {
    domain: string;
    metric: string;
    value: unknown;
  };
  actionItems: string[];
}

export interface CompetitiveThreat {
  type:
    | "ranking-loss"
    | "content-gap"
    | "technical-advantage"
    | "performance-gap";
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  probability: number; // 0-1
  competitorDomain: string;
  mitigation: string[];
  timeline: string;
}

export interface CompetitiveInsight {
  category: "market-trend" | "strategy-shift" | "opportunity" | "risk";
  title: string;
  description: string;
  confidence: number; // 0-1
  supportingData: unknown[];
  implications: string[];
}

export interface CompetitiveRecommendation {
  priority: "immediate" | "short-term" | "long-term";
  title: string;
  description: string;
  rationale: string;
  expectedOutcome: string;
  resources: string[];
  timeline: string;
}

export interface KeywordCompetitionData {
  gapAnalysis: {
    missingKeywords: Array<{
      keyword: string;
      volume: number;
      difficulty: number;
      competitorRanking: Record<string, number>;
    }>;
    opportunityKeywords: Array<{
      keyword: string;
      volume: number;
      currentRanking: number;
      competitorRanking: Record<string, number>;
      improvementPotential: number;
    }>;
  };
  rankingComparison: Record<string, Record<string, number>>;
  visibilityScore: Record<string, number>;
}

export interface ContentCompetitionData {
  contentGaps: Array<{
    topic: string;
    contentType: string;
    competitorUrls: string[];
    estimatedTraffic: number;
    keywords: string[];
  }>;
  contentPerformance: Record<
    string,
    {
      avgWordCount: number;
      avgEngagement: number;
      topTopics: string[];
      contentTypes: Record<string, number>;
    }
  >;
  publishingFrequency: Record<string, number>;
}

export interface TechnicalCompetitionData {
  seoScore: Record<string, number>;
  technicalIssues: Record<
    string,
    Array<{
      type: string;
      severity: "high" | "medium" | "low";
      count: number;
    }>
  >;
  structuredData: Record<string, string[]>;
  mobileOptimization: Record<string, number>;
}

export interface PerformanceCompetitionData {
  coreWebVitals: Record<
    string,
    {
      lcp: number;
      cls: number;
      fid: number;
      overall: number;
    }
  >;
  pageSpeed: Record<
    string,
    {
      desktop: number;
      mobile: number;
    }
  >;
  serverMetrics: Record<
    string,
    {
      ttfb: number;
      uptime: number;
      responseTime: number;
    }
  >;
}

export class FirecrawlCompetitiveIntelligence extends EventEmitter {
  private competitors: Map<string, CompetitorProfile> = new Map();
  private reports: Map<string, CompetitiveAnalysisReport> = new Map();
  private analysisQueue: string[] = [];
  private isProcessing = false;

  constructor() {
    super();
    this.startPeriodicAnalysis();
  }

  /**
   * Add a new competitor for tracking
   */
  async addCompetitor(
    userId: string,
    domain: string,
    config: Partial<CompetitorProfile>
  ): Promise<CompetitorProfile> {
    const competitorId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const competitor: CompetitorProfile = {
      id: competitorId,
      domain: this.normalizeDomain(domain),
      name: config.name || domain,
      description: config.description,
      industry: config.industry || "Unknown",
      targetKeywords: config.targetKeywords || [],
      trackingConfig: {
        crawlFrequency: config.trackingConfig?.crawlFrequency || "weekly",
        pages: config.trackingConfig?.pages || [
          "/",
          "/about",
          "/services",
          "/blog",
        ],
        metrics: config.trackingConfig?.metrics || this.getDefaultMetrics(),
        alertThresholds: config.trackingConfig?.alertThresholds || {
          rankingChange: 5,
          trafficChange: 20,
          backlinksChange: 10,
        },
      },
      metadata: {
        created: Date.now(),
        updated: Date.now(),
        analysisCount: 0,
        userId,
      },
    };

    this.competitors.set(competitorId, competitor);
    this.emit("competitor-added", { competitorId, domain, userId });

    // Queue initial analysis
    this.queueAnalysis(competitorId);

    return competitor;
  }

  /**
   * Perform comprehensive competitor analysis using Firecrawl MCP
   */
  async analyzeCompetitor(competitorId: string): Promise<void> {
    const competitor = this.competitors.get(competitorId);
    if (!competitor) {
      throw new Error(`Competitor ${competitorId} not found`);
    }

    try {
      this.emit("analysis-started", {
        competitorId,
        domain: competitor.domain,
      });

      // Crawl competitor website using Firecrawl MCP
      const crawlData = await this.crawlCompetitorSite(competitor);

      // Analyze SEO metrics
      const seoMetrics = await this.analyzeSEOMetrics(crawlData, competitor);

      // Analyze content
      const contentMetrics = await this.analyzeContent(crawlData);

      // Analyze technical aspects
      const technicalMetrics = await this.analyzeTechnical(crawlData);

      // Analyze performance
      const performanceMetrics = await this.analyzePerformance();

      // Detect changes from previous analysis
      const changes = this.detectChanges(competitor, {
        ...seoMetrics,
        ...contentMetrics,
        ...technicalMetrics,
        ...performanceMetrics,
      });

      // Update competitor profile
      competitor.lastAnalysis = {
        timestamp: Date.now(),
        status: "success",
        metrics: {
          ...seoMetrics,
          ...contentMetrics,
          ...technicalMetrics,
          ...performanceMetrics,
        },
        changes,
      };

      competitor.metadata.updated = Date.now();
      competitor.metadata.analysisCount++;

      // Check for alerts
      await this.checkAlerts(competitor, changes);

      this.emit("analysis-completed", {
        competitorId,
        domain: competitor.domain,
        changesCount: changes.length,
      });
    } catch (error) {
      competitor.lastAnalysis = {
        timestamp: Date.now(),
        status: "error",
        metrics: {},
        changes: [],
      };

      this.emit("analysis-error", {
        competitorId,
        domain: competitor.domain,
        error: error instanceof Error ? error.message : error,
      });

      throw error;
    }
  }

  /**
   * Crawl competitor site using Firecrawl MCP
   */
  private async crawlCompetitorSite(
    competitor: CompetitorProfile
  ): Promise<CrawlResponse> {
    try {
      // Use Firecrawl MCP to scrape competitor website
      const response = await fetch("/api/mcp/firecrawl/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://${competitor.domain}`,
          maxDepth: 2,
          limit: 50,
          allowExternalLinks: false,
          deduplicateSimilarURLs: true,
          scrapeOptions: {
            formats: ["markdown", "html"],
            onlyMainContent: true,
            includeTags: ["h1", "h2", "h3", "title", "meta"],
            waitFor: 3000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl crawl failed: ${response.statusText}`);
      }
      const json = await response.json();
      // Basic structural validation / fallback
      const data: CrawledPage[] = Array.isArray(json?.data) ? json.data : [];
      return { ...(json || {}), data } as CrawlResponse;
    } catch (error) {
      throw new Error(
        `Failed to crawl competitor site: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Analyze SEO metrics from crawled data
   */
  private async analyzeSEOMetrics(
    crawlData: CrawlResponse,
    competitor: CompetitorProfile
  ): Promise<CompetitorAggregatedMetrics> {
    const pages = crawlData.data;

    const metrics = {
      totalPages: pages.length,
      titleTags: 0,
      metaDescriptions: 0,
      h1Tags: 0,
      avgWordCount: 0,
      internalLinks: 0,
      externalLinks: 0,
      images: 0,
      altTextCoverage: 0,
      structuredData: 0,
      canonicalTags: 0,
      avgLoadTime: 0,
    };

    let totalWordCount = 0;

    pages.forEach((page: CrawledPage) => {
      const content = page.markdown || page.html || "";

      // Count basic SEO elements
      if (page.metadata?.title) metrics.titleTags++;
      if (page.metadata?.description) metrics.metaDescriptions++;
      if (content.includes("# ") || content.includes("<h1")) metrics.h1Tags++;

      // Word count analysis
      const wordCount = content.split(/\s+/).length;
      totalWordCount += wordCount;

      // Link analysis
      const internalLinkMatches = content.match(
        new RegExp(competitor.domain, "g")
      );
      metrics.internalLinks += internalLinkMatches
        ? internalLinkMatches.length
        : 0;

      const externalLinkMatches = content.match(
        /href=["']https?:\/\/(?!.*example\.com)/g
      );
      metrics.externalLinks += externalLinkMatches
        ? externalLinkMatches.length
        : 0;

      // Image analysis
      const imageMatches = content.match(/<img[^>]*>/g);
      if (imageMatches) {
        metrics.images += imageMatches.length;
        const altTextMatches = content.match(/alt=["'][^"']*["']/g);
        metrics.altTextCoverage += altTextMatches ? altTextMatches.length : 0;
      }

      // Structured data
      if (
        content.includes("application/ld+json") ||
        content.includes("microdata")
      ) {
        metrics.structuredData++;
      }

      // Canonical tags
      if (content.includes('rel="canonical"')) {
        metrics.canonicalTags++;
      }
    });

    metrics.avgWordCount =
      pages.length > 0 ? Math.round(totalWordCount / pages.length) : 0;
    metrics.altTextCoverage =
      metrics.images > 0
        ? Math.round((metrics.altTextCoverage / metrics.images) * 100)
        : 0;

    return metrics as CompetitorAggregatedMetrics;
  }

  /**
   * Analyze content metrics
   */
  private async analyzeContent(
    crawlData: CrawlResponse
  ): Promise<Record<string, unknown>> {
    const pages = crawlData.data;

    const metrics = {
      contentTypes: {} as Record<string, number>,
      topTopics: [] as string[],
      avgContentLength: 0,
      publishingFrequency: 0,
      contentFreshness: 0,
      duplicateContent: 0,
    };

    // Analyze content types and topics
    const topics: Record<string, number> = {};
    let totalContentLength = 0;

    pages.forEach((page: CrawledPage) => {
      const content = page.markdown || "";
      totalContentLength += content.length;

      // Simple topic extraction (in production, use NLP)
      const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
      words.forEach((word: string) => {
        if (
          ![
            "that",
            "with",
            "have",
            "this",
            "will",
            "your",
            "from",
            "they",
            "know",
            "want",
          ].includes(word)
        ) {
          topics[word] = (topics[word] || 0) + 1;
        }
      });
    });

    metrics.avgContentLength =
      pages.length > 0 ? Math.round(totalContentLength / pages.length) : 0;
    metrics.topTopics = Object.entries(topics)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([topic]) => topic);

    return metrics as Record<string, unknown>;
  }

  /**
   * Analyze technical metrics
   */
  private async analyzeTechnical(
    crawlData: CrawlResponse
  ): Promise<CompetitorAggregatedMetrics> {
    const pages = crawlData.data;

    const metrics = {
      seoScore: 0,
      mobileFriendly: 0,
      httpsUsage: 100, // Assumed from crawl success
      pageSpeedScore: 0,
      technicalIssues: {
        missingTitles: 0,
        missingDescriptions: 0,
        duplicateTitles: 0,
        tooLongTitles: 0,
        tooShortDescriptions: 0,
      },
    };

    const titles: string[] = [];

    pages.forEach((page: CrawledPage) => {
      const title = page.metadata?.title || "";
      const description = page.metadata?.description || "";

      // Track titles for duplicate detection
      if (title) {
        titles.push(title);
      } else {
        metrics.technicalIssues.missingTitles++;
      }

      // Description analysis
      if (!description) {
        metrics.technicalIssues.missingDescriptions++;
      } else if (description.length < 120) {
        metrics.technicalIssues.tooShortDescriptions++;
      }

      // Title length analysis
      if (title.length > 60) {
        metrics.technicalIssues.tooLongTitles++;
      }
    });

    // Duplicate title detection
    const uniqueTitles = new Set(titles);
    metrics.technicalIssues.duplicateTitles = titles.length - uniqueTitles.size;

    // Calculate overall SEO score (simplified)
    const totalIssues = Object.values(metrics.technicalIssues).reduce(
      (sum, count) => sum + count,
      0
    );
    const maxPossibleIssues = pages.length * 4; // 4 potential issues per page
    metrics.seoScore =
      maxPossibleIssues > 0
        ? Math.max(0, 100 - (totalIssues / maxPossibleIssues) * 100)
        : 100;

    return metrics as CompetitorAggregatedMetrics;
  }

  /**
   * Analyze performance metrics
   */
  private async analyzePerformance(): Promise<CompetitorAggregatedMetrics> {
    // Mock performance data - in production, integrate with PageSpeed API
    const metrics = {
      coreWebVitals: {
        lcp: 2.5 + Math.random() * 2, // Largest Contentful Paint
        cls: Math.random() * 0.2, // Cumulative Layout Shift
        fid: 50 + Math.random() * 100, // First Input Delay
        overall: 0,
      },
      pageSpeed: {
        desktop: 70 + Math.random() * 30,
        mobile: 50 + Math.random() * 40,
      },
      serverMetrics: {
        ttfb: 200 + Math.random() * 300, // Time to First Byte
        uptime: 99.5 + Math.random() * 0.5,
        responseTime: 100 + Math.random() * 200,
      },
    };

    // Calculate overall Core Web Vitals score
    const lcpScore =
      metrics.coreWebVitals.lcp <= 2.5
        ? 100
        : Math.max(0, 100 - (metrics.coreWebVitals.lcp - 2.5) * 20);
    const clsScore =
      metrics.coreWebVitals.cls <= 0.1
        ? 100
        : Math.max(0, 100 - (metrics.coreWebVitals.cls - 0.1) * 500);
    const fidScore =
      metrics.coreWebVitals.fid <= 100
        ? 100
        : Math.max(0, 100 - (metrics.coreWebVitals.fid - 100) * 0.5);

    metrics.coreWebVitals.overall = Math.round(
      (lcpScore + clsScore + fidScore) / 3
    );

    return metrics as CompetitorAggregatedMetrics;
  }

  /**
   * Detect changes from previous analysis
   */
  private detectChanges(
    competitor: CompetitorProfile,
    currentMetrics: CompetitorAggregatedMetrics
  ): CompetitorChange[] {
    const changes: CompetitorChange[] = [];

    if (!competitor.lastAnalysis?.metrics) {
      return changes; // No previous analysis to compare
    }

    const previousMetrics = competitor.lastAnalysis.metrics;
    const thresholds = competitor.trackingConfig.alertThresholds;

    // Compare SEO score
    if (
      typeof previousMetrics.seoScore === "number" &&
      typeof currentMetrics.seoScore === "number"
    ) {
      const change = currentMetrics.seoScore - previousMetrics.seoScore;
      if (Math.abs(change) >= (thresholds.rankingChange || 5)) {
        changes.push({
          type: "ranking",
          description: `SEO score ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change).toFixed(1)} points`,
          impact:
            Math.abs(change) > 10
              ? "high"
              : Math.abs(change) > 5
                ? "medium"
                : "low",
          metric: "seoScore",
          oldValue: previousMetrics.seoScore,
          newValue: currentMetrics.seoScore,
          timestamp: Date.now(),
          confidence: 0.9,
        });
      }
    }

    // Compare Core Web Vitals
    if (
      previousMetrics.coreWebVitals?.overall != null &&
      currentMetrics.coreWebVitals?.overall != null
    ) {
      const change =
        currentMetrics.coreWebVitals.overall -
        previousMetrics.coreWebVitals.overall;
      if (Math.abs(change) >= 10) {
        changes.push({
          type: "performance",
          description: `Core Web Vitals score ${change > 0 ? "improved" : "declined"} by ${Math.abs(change)} points`,
          impact: Math.abs(change) > 20 ? "high" : "medium",
          metric: "coreWebVitals.overall",
          oldValue: previousMetrics.coreWebVitals.overall,
          newValue: currentMetrics.coreWebVitals.overall,
          timestamp: Date.now(),
          confidence: 0.8,
        });
      }
    }

    // Compare content metrics
    if (
      typeof previousMetrics.totalPages === "number" &&
      typeof currentMetrics.totalPages === "number"
    ) {
      const change = currentMetrics.totalPages - previousMetrics.totalPages;
      if (Math.abs(change) >= 5) {
        changes.push({
          type: "content",
          description: `${change > 0 ? "Added" : "Removed"} ${Math.abs(change)} pages`,
          impact: Math.abs(change) > 10 ? "medium" : "low",
          metric: "totalPages",
          oldValue: previousMetrics.totalPages,
          newValue: currentMetrics.totalPages,
          timestamp: Date.now(),
          confidence: 1.0,
        });
      }
    }

    return changes;
  }

  /**
   * Check for alerts based on changes
   */
  private async checkAlerts(
    competitor: CompetitorProfile,
    changes: CompetitorChange[]
  ): Promise<void> {
    const highImpactChanges = changes.filter(
      (change) => change.impact === "high"
    );

    if (highImpactChanges.length > 0) {
      this.emit("competitor-alert", {
        competitorId: competitor.id,
        domain: competitor.domain,
        userId: competitor.metadata.userId,
        changes: highImpactChanges,
        severity: "high",
      });
    }
  }

  /**
   * Generate competitive analysis report
   */
  async generateCompetitiveReport(
    userId: string,
    competitorIds: string[],
    analysisType: CompetitiveAnalysisReport["analysisType"] = "comprehensive"
  ): Promise<CompetitiveAnalysisReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const competitors = competitorIds
      .map((id) => this.competitors.get(id))
      .filter(Boolean) as CompetitorProfile[];

    if (competitors.length === 0) {
      throw new Error("No valid competitors found for report generation");
    }

    // Generate analysis based on type
    const findings = await this.generateFindings(competitors, analysisType);
    const data = await this.generateCompetitiveData(competitors, analysisType);

    const report: CompetitiveAnalysisReport = {
      id: reportId,
      userId,
      competitors: competitors.map((c) => c.domain),
      analysisType,
      timeframe: {
        start: Math.min(...competitors.map((c) => c.metadata.created)),
        end: Date.now(),
      },
      findings,
      data,
      metadata: {
        generated: Date.now(),
        format: "json",
        size: 0, // Will be calculated after JSON stringification
        processingTime: Date.now() - startTime,
      },
    };

    // Calculate report size
    report.metadata.size = JSON.stringify(report).length;

    this.reports.set(reportId, report);
    this.emit("report-generated", {
      reportId,
      userId,
      competitorCount: competitors.length,
    });

    return report;
  }

  /**
   * Generate competitive findings
   */
  private async generateFindings(
    competitors: CompetitorProfile[],
    _analysisType: CompetitiveAnalysisReport["analysisType"]
  ): Promise<CompetitiveAnalysisReport["findings"]> {
    const opportunities: CompetitiveOpportunity[] = [];
    const threats: CompetitiveThreat[] = [];
    const insights: CompetitiveInsight[] = [];
    const recommendations: CompetitiveRecommendation[] = [];

    // Analyze each competitor for opportunities and threats
    competitors.forEach((competitor) => {
      if (!competitor.lastAnalysis?.metrics) return;

      const metrics = competitor.lastAnalysis.metrics;

      // SEO opportunities
      if (typeof metrics.seoScore === "number" && metrics.seoScore > 80) {
        opportunities.push({
          type: "technical",
          title: `Learn from ${competitor.name}'s SEO Excellence`,
          description: `${competitor.name} has a high SEO score of ${metrics.seoScore}. Analyze their technical implementation.`,
          priority: "high",
          estimatedImpact: 8,
          effort: "medium",
          competitorData: {
            domain: competitor.domain,
            metric: "seoScore",
            value: metrics.seoScore,
          },
          actionItems: [
            "Audit their on-page SEO implementation",
            "Analyze their site structure and navigation",
            "Study their content optimization strategies",
          ],
        });
      }

      // Performance opportunities
      if (
        metrics.coreWebVitals?.overall != null &&
        metrics.coreWebVitals.overall > 90
      ) {
        opportunities.push({
          type: "performance",
          title: `Performance Optimization Opportunity`,
          description: `${competitor.name} achieves excellent Core Web Vitals scores. Study their optimization techniques.`,
          priority: "medium",
          estimatedImpact: 7,
          effort: "high",
          competitorData: {
            domain: competitor.domain,
            metric: "coreWebVitals.overall",
            value: metrics.coreWebVitals.overall,
          },
          actionItems: [
            "Analyze their page load optimization",
            "Study their image optimization strategies",
            "Review their caching implementation",
          ],
        });
      }

      // Content threats
      if (typeof metrics.totalPages === "number" && metrics.totalPages > 100) {
        threats.push({
          type: "content-gap",
          title: `Content Volume Advantage`,
          description: `${competitor.name} has ${metrics.totalPages} pages, indicating strong content strategy.`,
          severity: "medium",
          probability: 0.7,
          competitorDomain: competitor.domain,
          mitigation: [
            "Increase content production frequency",
            "Focus on high-value content gaps",
            "Optimize existing content for better performance",
          ],
          timeline: "3-6 months",
        });
      }
    });

    // Generate insights
    insights.push({
      category: "market-trend",
      title: "Competitive Landscape Analysis",
      description: `Analysis of ${competitors.length} competitors reveals varying levels of SEO maturity and content strategies.`,
      confidence: 0.85,
      supportingData: competitors.map((c) => ({
        domain: c.domain,
        seoScore: c.lastAnalysis?.metrics?.seoScore,
        pageCount: c.lastAnalysis?.metrics?.totalPages,
      })),
      implications: [
        "Market shows mixed SEO adoption levels",
        "Opportunity exists for technical differentiation",
        "Content volume varies significantly across competitors",
      ],
    });

    // Generate recommendations
    recommendations.push({
      priority: "immediate",
      title: "Technical SEO Audit",
      description:
        "Conduct comprehensive technical SEO audit based on competitor analysis",
      rationale:
        "Competitors show varying SEO scores, indicating optimization opportunities",
      expectedOutcome: "Improved search visibility and technical performance",
      resources: ["SEO specialist", "Development team", "Content team"],
      timeline: "2-4 weeks",
    });

    return { opportunities, threats, insights, recommendations };
  }

  /**
   * Generate competitive data analysis
   */
  private async generateCompetitiveData(
    competitors: CompetitorProfile[],
    _analysisType: CompetitiveAnalysisReport["analysisType"]
  ): Promise<CompetitiveAnalysisReport["data"]> {
    // Mock data generation - in production, compile actual competitor data
    const keywordAnalysis: KeywordCompetitionData = {
      gapAnalysis: {
        missingKeywords: [
          {
            keyword: "seo audit tool",
            volume: 5000,
            difficulty: 45,
            competitorRanking: {},
          },
          {
            keyword: "website optimization",
            volume: 8000,
            difficulty: 50,
            competitorRanking: {},
          },
        ],
        opportunityKeywords: [
          {
            keyword: "seo analysis",
            volume: 3000,
            currentRanking: 15,
            competitorRanking: {},
            improvementPotential: 10,
          },
        ],
      },
      rankingComparison: {},
      visibilityScore: {},
    };

    const contentAnalysis: ContentCompetitionData = {
      contentGaps: [
        {
          topic: "Advanced SEO Techniques",
          contentType: "blog post",
          competitorUrls: competitors.map(
            (c) => `https://${c.domain}/blog/advanced-seo`
          ),
          estimatedTraffic: 2000,
          keywords: ["advanced seo", "seo techniques", "seo strategies"],
        },
      ],
      contentPerformance: {},
      publishingFrequency: {},
    };

    const technicalAnalysis: TechnicalCompetitionData = {
      seoScore: {},
      technicalIssues: {},
      structuredData: {},
      mobileOptimization: {},
    };

    const performanceAnalysis: PerformanceCompetitionData = {
      coreWebVitals: {},
      pageSpeed: {},
      serverMetrics: {},
    };

    // Populate with actual competitor data
    competitors.forEach((competitor) => {
      const metrics = competitor.lastAnalysis?.metrics;
      if (!metrics) return;
      if (typeof metrics.seoScore === "number") {
        keywordAnalysis.visibilityScore[competitor.domain] = metrics.seoScore;
        technicalAnalysis.seoScore[competitor.domain] = metrics.seoScore;
      }
      if (metrics.coreWebVitals) {
        performanceAnalysis.coreWebVitals[competitor.domain] =
          metrics.coreWebVitals as PerformanceCompetitionData["coreWebVitals"][string];
      }
      if (metrics.pageSpeed) {
        performanceAnalysis.pageSpeed[competitor.domain] =
          metrics.pageSpeed as PerformanceCompetitionData["pageSpeed"][string];
      }
    });

    return {
      keywordAnalysis,
      contentAnalysis,
      technicalAnalysis,
      performanceAnalysis,
    };
  }

  /**
   * Get default metrics for tracking
   */
  private getDefaultMetrics(): CompetitorMetric[] {
    return [
      {
        name: "SEO Score",
        type: "seo",
        value: 0,
        timestamp: Date.now(),
        source: "firecrawl",
      },
      {
        name: "Page Count",
        type: "content",
        value: 0,
        timestamp: Date.now(),
        source: "firecrawl",
      },
      {
        name: "Core Web Vitals",
        type: "performance",
        value: 0,
        timestamp: Date.now(),
        source: "pagespeed",
      },
      {
        name: "Mobile Score",
        type: "technical",
        value: 0,
        timestamp: Date.now(),
        source: "pagespeed",
      },
    ];
  }

  /**
   * Queue competitor for analysis
   */
  private queueAnalysis(competitorId: string): void {
    if (!this.analysisQueue.includes(competitorId)) {
      this.analysisQueue.push(competitorId);
      // Fire-and-forget processing; internal loop manages its own async lifecycle.
      // Explicit void satisfies eslint no-floating-promises.
      void this.processAnalysisQueue();
    }
  }

  /**
   * Process analysis queue
   */
  private async processAnalysisQueue(): Promise<void> {
    if (this.isProcessing || this.analysisQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.analysisQueue.length > 0) {
      const competitorId = this.analysisQueue.shift()!;

      try {
        await this.analyzeCompetitor(competitorId);
        // Wait between analyses to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Analysis failed for competitor ${competitorId}:`, error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Start periodic analysis
   */
  private startPeriodicAnalysis(): void {
    // Run analysis every hour for competitors that need updates
    setInterval(
      () => {
        const now = Date.now();

        this.competitors.forEach((competitor) => {
          const lastAnalysis = competitor.lastAnalysis?.timestamp || 0;
          const frequency = competitor.trackingConfig.crawlFrequency;

          let interval = 24 * 60 * 60 * 1000; // daily default
          if (frequency === "weekly") interval = 7 * 24 * 60 * 60 * 1000;
          if (frequency === "monthly") interval = 30 * 24 * 60 * 60 * 1000;

          if (now - lastAnalysis >= interval) {
            // Fire-and-forget queue enqueue (synchronous) – safe
            this.queueAnalysis(competitor.id);
          }
        });
      },
      60 * 60 * 1000
    ); // Check every hour
  }

  /**
   * Normalize domain name
   */
  private normalizeDomain(domain: string): string {
    return domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
  }

  /**
   * Get competitor profile
   */
  getCompetitor(competitorId: string): CompetitorProfile | undefined {
    return this.competitors.get(competitorId);
  }

  /**
   * Get all competitors for a user
   */
  getUserCompetitors(userId: string): CompetitorProfile[] {
    return Array.from(this.competitors.values()).filter(
      (c) => c.metadata.userId === userId
    );
  }

  /**
   * Get analysis report
   */
  getReport(reportId: string): CompetitiveAnalysisReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Update competitor configuration
   */
  updateCompetitor(
    competitorId: string,
    updates: Partial<CompetitorProfile>
  ): boolean {
    const competitor = this.competitors.get(competitorId);
    if (!competitor) return false;

    Object.assign(competitor, updates);
    competitor.metadata.updated = Date.now();

    this.emit("competitor-updated", { competitorId, updates });
    return true;
  }

  /**
   * Delete competitor
   */
  deleteCompetitor(competitorId: string, userId: string): boolean {
    const competitor = this.competitors.get(competitorId);
    if (!competitor || competitor.metadata.userId !== userId) {
      return false;
    }

    this.competitors.delete(competitorId);
    this.emit("competitor-deleted", { competitorId, userId });
    return true;
  }
}

// Export singleton instance
export const firecrawlCompetitiveIntelligence =
  new FirecrawlCompetitiveIntelligence();
