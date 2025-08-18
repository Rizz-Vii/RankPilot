// Core Type Definitions for RankPilot
// Generated: July 31, 2025 - Final TypeScript Fix

// ============================================================================
// COMPETITOR ANALYSIS TYPES
// ============================================================================

export interface CompetitorAnalysisInput {
    urls: string[];
    yourUrl: string;
    competitorUrls: string[];
    keywords: string[];
    targetKeywords: string[];
    analysisDepth: 'quick' | 'standard' | 'comprehensive';
}

export interface CompetitorAnalysisOutput {
    overallScore: number;
    rankings: Array<{
        domain: string;
        keyword: string;
        keywords: string[];
        avgPosition: number;
        visibility: number;
        traffic: number;
        backlinks: number;
        yourRank?: {
            rank: number;
        };
    }>;
    contentGaps: string[];
    technicalInsights: {
        pageSpeed: number;
        mobileScore: number;
        coreWebVitals: boolean;
    };
    competitiveStrengths: string[];
    opportunities: string[];
}

// ============================================================================
// CONTENT BRIEF TYPES
// ============================================================================

export interface ContentBriefInput {
    topic: string;
    keyword: string;
    targetKeywords: string[];
    targetAudience: string;
    contentType: string;
}

export interface ContentBriefOutput {
    topic: string;
    title: string;
    briefSummary: string;
    primaryKeyword: string;
    searchIntent: string;
    seoScore: number;
    wordCount: number;
    readingTime: number;
    targetKeywords: string[];
    semanticKeywords: string[];
    recommendedMeta: {
        title: string;
        description: string;
    };
    competitorInsights: string[];
    contentStructure: Array<{
        level: number;
        title: string;
        description: string;
    }>;
    llmGeneratedOutline: Array<{
        level: number;
        title: string;
        description: string;
    }>;
    contentGaps: string[];
    seoRecommendations: string[];
}

// ============================================================================
// REWRITE ANALYSIS TYPES
// ============================================================================

export interface ComparisonMatrix {
    metrics: Record<string, number>;
    variants: string[];
    winner: string;
    reasoning: string;
}

export interface RewriteAnalysis {
    originalAnalysis: {
        wordCount: number;
        readabilityScore: number;
        keywordDensity: unknown;
        sentimentScore: number;
        structureScore: number;
        seoScore: number;
        issues: string[];
    };
    variants: string[];
    recommendations: string[];
    bestVariant: string;
    comparisonMatrix: ComparisonMatrix;
}

// ============================================================================
// AUDIT URL TYPES
// ============================================================================

export interface AuditUrlInput {
    url: string;
    analysisDepth: 'quick' | 'standard' | 'comprehensive';
    includeImages?: boolean;
    checkMobile?: boolean;
}

export interface AuditUrlOutput {
    url: string;
    overallScore: number;
    summary: string;
    items: Array<{
        id: string;
        name: string;
        title: string;
        description: string;
        details: string;
        status: 'pass' | 'fail' | 'warning';
        score: number;
        impact: 'low' | 'medium' | 'high';
        recommendation: string;
    }>;
    performance: {
        lcp: number;
        fid: number;
        cls: number;
        ttfb: number;
    };
    accessibility: {
        score: number;
        issues: number;
    };
    seo: {
        score: number;
        metaTitle: boolean;
        metaDescription: boolean;
        headings: boolean;
    };
}

// ============================================================================
// LINK ANALYSIS TYPES
// ============================================================================

export interface LinkAnalysisInput {
    url: string;
    analysisType: 'backlinks' | 'internal' | 'comprehensive';
    limit?: number;
}

export interface LinkAnalysisOutput {
    url: string;
    totalBacklinks: number;
    summary: {
        totalBacklinks: number;
        referringDomains: number;
    };
    backlinks: Array<{
        sourceUrl: string;
        backlinkUrl: string;
        referringDomain: string;
        anchor: string;
        anchorText: string;
        domain: string;
        authority: number;
        domainAuthority: number;
        type: 'dofollow' | 'nofollow';
        discovered: string;
        status: 'live' | 'broken' | 'redirect';
    }>;
    metrics: {
        domainAuthority: number;
        trustScore: number;
        spamScore: number;
    };
    insights: string[];
}

// ============================================================================
// SERP VIEW TYPES
// ============================================================================

export interface SerpViewInput {
    keyword: string;
    location: string;
    device: 'desktop' | 'mobile';
    searchEngine: 'google' | 'bing';
}

export interface SerpViewOutput {
    keyword: string;
    location: string;
    organicResults: Array<{
        position: number;
        title: string;
        url: string;
        snippet: string;
    }>;
    peopleAlsoAsk: Array<{
        question: string;
        answer: string;
    }>;
    serpFeatures: {
        hasFeaturedSnippet: boolean;
        hasImagePack: boolean;
        hasVideoCarousel: boolean;
        topStories: boolean;
    };
    results: Array<{
        position: number;
        title: string;
        url: string;
        description: string;
        displayUrl: string;
    }>;
    features: Array<{
        type: string;
        content: string;
    }>;
    totalResults: number;
    searchTime: number;
}

// ============================================================================
// INSIGHTS GENERATION TYPES
// ============================================================================

export interface GenerateInsightsOutput {
    insights: Array<{
        id: string;
        title: string;
        description: string;
        type: 'opportunity' | 'warning' | 'success';
        impact: 'low' | 'medium' | 'high';
        priority: 'low' | 'medium' | 'high';
        category: string;
        estimatedImpact: string;
        actionItems: string[];
        metrics: Record<string, number>;
        actionLink?: string;
        actionText?: string;
    }>;
    summary: string;
    score: number;
}

// ============================================================================
// USAGE QUOTA TYPES
// ============================================================================

export interface UsageCheck {
    allowed: boolean;
    remaining: number;
    limit: number;
    remainingQuota: number;
    resetDate: Date;
}

// ============================================================================
// KEYWORD TOOL TYPES
// ============================================================================

export interface KeywordSuggestion {
    seed: string;
    query?: string;
    limit?: number;
    count?: number;
    includeMetrics?: boolean;
}

// ============================================================================
// FORM PROPS TYPES
// ============================================================================

export interface KeywordToolFormProps {
    onSubmit: (values: { topic: string; includeLongTailKeywords: boolean; }) => Promise<void>;
    isLoading: boolean;
}

export interface SeoAuditFormProps {
    onSubmit: (values: AuditUrlInput) => Promise<void>;
    isLoading: boolean;
}

// ============================================================================
// CHART COMPONENT TYPES
// ============================================================================

export interface ChartConfig {
    [key: string]: {
        label: string;
        color: string;
    };
}

// ============================================================================
// UTILITY FUNCTION TYPES
// ============================================================================

export interface ContentFunctions {
    generateContentBrief:
    (input: ContentBriefInput) => Promise<ContentBriefOutput>;
    generateInsights:
    (input: { keywords: string[]; urls: string[]; activities?: unknown; }) => Promise<GenerateInsightsOutput>;
    getKeywordSuggestions:
    (input: KeywordSuggestion) => Promise<KeywordSuggestion[]>;
    analyzeCompetitors:
    (input: CompetitorAnalysisInput) => Promise<CompetitorAnalysisOutput>;
    analyzeLinks:
    (input: LinkAnalysisInput) => Promise<LinkAnalysisOutput>;
    getSerpData:
    (input: SerpViewInput) => Promise<SerpViewOutput>;
}
