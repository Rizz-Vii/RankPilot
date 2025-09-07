/**
 * RankPilot Comprehensive Database Schema & Data Generator
 *
 * Generates realistic database structure and sample data for a 1-year-old
 * AI-first SEO SaaS platform with 4,000 users and $1.4M ARR.
 *
 * Generated: July 26, 2025
 * Status: Production-Ready Schema with 1-Year Simulation Data
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert("./firebase-admin-key.json"),
      projectId: "rankpilot-h3jpc",
    });
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
    throw error;
  }
}

const db = getFirestore();

// === DATABASE SCHEMA INTERFACES ===

interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  role: "free" | "starter" | "agency" | "enterprise" | "admin";
  subscriptionTier: "free" | "starter" | "agency" | "enterprise" | "admin";
  subscriptionStatus: "active" | "canceled" | "past_due" | "trialing";
  subscriptionStartDate: Timestamp;
  subscriptionEndDate?: Timestamp;
  profile: {
    company?: string;
    website?: string;
    industry?: string;
    teamSize?: string;
    goals?: string[];
    avatar?: string;
    timezone?: string;
    language?: string;
  };
  preferences: {
    emailNotifications: boolean;
    weeklyReports: boolean;
    competitorAlerts: boolean;
    seoRecommendations: boolean;
    darkMode: boolean;
    dashboardLayout: "compact" | "standard" | "detailed";
  };
  usage: {
    neuroSeoAnalyses: number;
    keywordSearches: number;
    contentAnalyses: number;
    competitorReports: number;
    teamMembers: number;
    apiCalls: number;
  };
  limits: {
    neuroSeoAnalyses: number;
    keywordSearches: number;
    contentAnalyses: number;
    competitorReports: number;
    teamMembers: number;
    apiCalls: number;
  };
  lastLoginAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ProjectDocument {
  id: string;
  userId: string;
  name: string;
  domain: string;
  url: string;
  description?: string;
  industry?: string;
  targetMarkets: string[];
  targetKeywords: string[];
  competitors: string[];
  status: "active" | "paused" | "archived";
  settings: {
    crawlDepth: number;
    analysisFrequency: "daily" | "weekly" | "monthly";
    alertThresholds: {
      rankingDrop: number;
      trafficDrop: number;
      errorIncrease: number;
    };
  };
  lastAnalyzedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface NeuroSeoAnalysisDocument {
  id: string;
  userId: string;
  projectId?: string;
  analysisType: "comprehensive" | "quick" | "competitor" | "content";
  urls: string[];
  targetKeywords: string[];
  engines: {
    neuralCrawler: {
      status: "completed" | "failed" | "pending";
      results?: {
        pages: Array<{
          url: string;
          title: string;
          metaDescription: string;
          content: string;
          headings: Record<string, string[]>;
          images: Array<{ src: string; alt: string; title?: string }>;
          links: Array<{
            href: string;
            text: string;
            type: "internal" | "external";
          }>;
          technicalIssues: string[];
        }>;
        siteStructure: {
          totalPages: number;
          uniquePages: number;
          duplicateContent: number;
          orphanPages: number;
        };
      };
      executionTime: number;
    };
    semanticMap: {
      status: "completed" | "failed" | "pending";
      results?: {
        topicClusters: Array<{
          topic: string;
          keywords: string[];
          contentGaps: string[];
          relatedTopics: string[];
          semanticScore: number;
        }>;
        keywordDensity: Record<string, number>;
        readabilityScore: number;
        contentDepth: number;
      };
      executionTime: number;
    };
    aiVisibilityEngine: {
      status: "completed" | "failed" | "pending";
      results?: {
        aiCitations: Array<{
          aiPlatform: string;
          citationCount: number;
          citationContext: string[];
          citationQuality: "high" | "medium" | "low";
        }>;
        visibilityScore: number;
        optimizationSuggestions: string[];
        competitorComparison: Array<{
          competitor: string;
          visibilityScore: number;
          citations: number;
        }>;
      };
      executionTime: number;
    };
    trustBlock: {
      status: "completed" | "failed" | "pending";
      results?: {
        eatScore: {
          expertise: number;
          authoritativeness: number;
          trustworthiness: number;
          overall: number;
        };
        trustSignals: Array<{
          signal: string;
          status: "present" | "missing" | "weak";
          impact: "high" | "medium" | "low";
          recommendations: string[];
        }>;
        authorCredibility: {
          authorBio: boolean;
          credentials: boolean;
          linkedinProfile: boolean;
          authorPhoto: boolean;
        };
      };
      executionTime: number;
    };
    rewriteGen: {
      status: "completed" | "failed" | "pending";
      results?: {
        contentSuggestions: Array<{
          section: string;
          originalText: string;
          suggestedText: string;
          improvementType: "seo" | "readability" | "engagement" | "conversion";
          confidence: number;
        }>;
        titleSuggestions: string[];
        metaDescriptionSuggestions: string[];
        overallImprovementScore: number;
      };
      executionTime: number;
    };
    orchestrator: {
      status: "completed" | "failed" | "pending";
      results?: {
        overallScore: number;
        priorityActions: Array<{
          action: string;
          impact: "high" | "medium" | "low";
          effort: "high" | "medium" | "low";
          timeline: string;
        }>;
        competitiveAnalysis: {
          strengthsVsCompetitors: string[];
          weaknessesVsCompetitors: string[];
          opportunities: string[];
          threats: string[];
        };
      };
      executionTime: number;
    };
  };
  summary: {
    overallScore: number;
    keyFindings: string[];
    quickWins: string[];
    longTermStrategy: string[];
    estimatedImpact: string;
  };
  status: "completed" | "failed" | "pending" | "processing";
  createdAt: Timestamp;
  completedAt?: Timestamp;
  executionTime?: number;
}

interface KeywordResearchDocument {
  id: string;
  userId: string;
  projectId?: string;
  seedKeyword: string;
  targetLocation?: string;
  language: string;
  results: Array<{
    keyword: string;
    searchVolume: number;
    competition: "low" | "medium" | "high";
    cpc: number;
    difficulty: number;
    trend: Array<{ month: string; volume: number }>;
    relatedKeywords: string[];
    questions: string[];
    intent: "informational" | "commercial" | "transactional" | "navigational";
  }>;
  filters: {
    minSearchVolume?: number;
    maxDifficulty?: number;
    maxCpc?: number;
    intentFilter?: string[];
  };
  totalResults: number;
  createdAt: Timestamp;
}

interface ContentAnalysisDocument {
  id: string;
  userId: string;
  projectId?: string;
  url: string;
  content: string;
  analysis: {
    readabilityScore: number;
    seoScore: number;
    wordCount: number;
    readingTime: number;
    keywordDensity: Record<string, number>;
    headingStructure: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
    };
    technicalSeo: {
      titleTag: { present: boolean; length: number; optimized: boolean };
      metaDescription: { present: boolean; length: number; optimized: boolean };
      altTags: { total: number; missing: number; optimized: number };
      internalLinks: number;
      externalLinks: number;
    };
    contentQuality: {
      originalityScore: number;
      expertiseLevel: "beginner" | "intermediate" | "expert";
      topicDepth: number;
      sentimentScore: number;
    };
    improvementSuggestions: Array<{
      category: "seo" | "readability" | "content" | "technical";
      suggestion: string;
      priority: "high" | "medium" | "low";
      estimatedImpact: string;
    }>;
  };
  createdAt: Timestamp;
}

interface SeoAuditDocument {
  id: string;
  userId: string;
  projectId?: string;
  url: string;
  auditType: "technical" | "content" | "performance" | "comprehensive";
  results: {
    overallScore: number;
    technical: {
      score: number;
      issues: Array<{
        type: string;
        severity: "critical" | "warning" | "notice";
        description: string;
        recommendation: string;
        affectedPages: number;
      }>;
      metrics: {
        loadTime: number;
        mobileSpeed: number;
        desktopSpeed: number;
        coreWebVitals: {
          lcp: number;
          fid: number;
          cls: number;
        };
      };
    };
    onPage: {
      score: number;
      titleTags: { optimized: number; total: number; issues: string[] };
      metaDescriptions: { optimized: number; total: number; issues: string[] };
      headings: { proper: number; total: number; issues: string[] };
      content: { quality: number; uniqueness: number; issues: string[] };
    };
    offPage: {
      score: number;
      backlinks: { total: number; quality: number; toxic: number };
      domainAuthority: number;
      linkProfile: {
        follow: number;
        nofollow: number;
        domains: number;
        anchors: Record<string, number>;
      };
    };
  };
  recommendations: Array<{
    category: "technical" | "content" | "links";
    priority: number;
    title: string;
    description: string;
    effort: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    estimatedTime: string;
  }>;
  createdAt: Timestamp;
}

interface ContentBriefDocument {
  id: string;
  userId: string;
  projectId?: string;
  targetKeyword: string;
  contentType: "blog" | "landing" | "product" | "guide" | "comparison";
  brief: {
    title: string;
    metaDescription: string;
    outline: Array<{
      heading: string;
      subheadings: string[];
      keyPoints: string[];
      wordCount: number;
    }>;
    targetAudience: {
      demographics: string;
      painPoints: string[];
      goals: string[];
      expertiseLevel: "beginner" | "intermediate" | "expert";
    };
    seoGuidelines: {
      primaryKeyword: string;
      secondaryKeywords: string[];
      semanticKeywords: string[];
      keywordDensity: number;
      targetWordCount: number;
    };
    competitorAnalysis: Array<{
      url: string;
      title: string;
      wordCount: number;
      strengths: string[];
      weaknesses: string[];
      contentGaps: string[];
    }>;
    callsToAction: string[];
    internalLinkSuggestions: string[];
    externalReferences: string[];
  };
  status: "draft" | "approved" | "in_progress" | "completed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface CompetitorAnalysisDocument {
  id: string;
  userId: string;
  projectId?: string;
  competitors: string[];
  analysis: {
    overview: Array<{
      domain: string;
      domainAuthority: number;
      organicTraffic: number;
      organicKeywords: number;
      backlinks: number;
      estimatedValue: number;
    }>;
    keywordGaps: Array<{
      keyword: string;
      userRank?: number;
      competitorRanks: Record<string, number>;
      searchVolume: number;
      difficulty: number;
      opportunity: "high" | "medium" | "low";
    }>;
    contentGaps: Array<{
      topic: string;
      competitorCoverage: Record<string, boolean>;
      searchVolume: number;
      priority: "high" | "medium" | "low";
      suggestedContent: string[];
    }>;
    backLinkGaps: Array<{
      domain: string;
      domainAuthority: number;
      linkingTo: string[];
      linkingToUser: boolean;
      opportunity: "high" | "medium" | "low";
    }>;
    swotAnalysis: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
  };
  createdAt: Timestamp;
}

interface SerpDataDocument {
  id: string;
  keyword: string;
  location: string;
  language: string;
  searchEngine: "google" | "bing" | "yahoo";
  results: Array<{
    position: number;
    url: string;
    title: string;
    description: string;
    domain: string;
    features: string[]; // featured snippet, people also ask, etc.
  }>;
  features: {
    featuredSnippet?: { url: string; content: string };
    peopleAlsoAsk?: string[];
    relatedSearches?: string[];
    localPack?: Array<{ name: string; address: string; rating: number }>;
  };
  searchVolume: number;
  difficulty: number;
  createdAt: Timestamp;
}

interface LinkAnalysisDocument {
  id: string;
  userId: string;
  projectId?: string;
  targetUrl: string;
  analysis: {
    summary: {
      totalBacklinks: number;
      uniqueDomains: number;
      domainAuthority: number;
      toxicLinks: number;
      qualityScore: number;
    };
    backlinks: Array<{
      sourceUrl: string;
      sourceDomain: string;
      domainAuthority: number;
      anchorText: string;
      linkType: "follow" | "nofollow";
      linkQuality: "high" | "medium" | "low" | "toxic";
      firstSeen: Timestamp;
      lastSeen: Timestamp;
    }>;
    opportunities: Array<{
      domain: string;
      domainAuthority: number;
      relevanceScore: number;
      contactInfo?: string;
      outreachStatus:
        | "not_contacted"
        | "contacted"
        | "responded"
        | "link_acquired";
    }>;
    anchorTextDistribution: Record<string, number>;
    domainDistribution: Record<string, number>;
  };
  createdAt: Timestamp;
}

interface TeamDocument {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  plan: "agency" | "enterprise";
  members: Array<{
    userId: string;
    email: string;
    role: "owner" | "admin" | "editor" | "viewer";
    joinedAt: Timestamp;
    permissions: string[];
  }>;
  projects: string[]; // project IDs
  settings: {
    allowInvites: boolean;
    requireApproval: boolean;
    brandingEnabled: boolean;
    reportSharing: boolean;
  };
  usage: {
    totalAnalyses: number;
    totalReports: number;
    storageUsed: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ActivityDocument {
  id: string;
  userId: string;
  type:
    | "audit"
    | "keyword-research"
    | "content-analysis"
    | "competitor-analysis"
    | "login"
    | "report-export"
    | "team-invite";
  description: string;
  metadata: {
    projectId?: string;
    analysisId?: string;
    url?: string;
    keyword?: string;
    [key: string]: unknown;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

interface BillingDocument {
  id: string;
  userId: string;
  type: "subscription" | "one_time" | "refund" | "chargeback";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod: "stripe" | "paypal" | "invoice";
  subscriptionTier?: string;
  billingPeriod?: {
    start: Timestamp;
    end: Timestamp;
  };
  invoice: {
    number: string;
    downloadUrl?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
  paymentDetails: {
    stripePaymentId?: string;
    paypalTransactionId?: string;
    last4?: string;
    brand?: string;
  };
  createdAt: Timestamp;
  processedAt?: Timestamp;
}

interface UsageDocument {
  id: string;
  userId: string;
  period: string; // YYYY-MM format
  usage: {
    neuroSeoAnalyses: number;
    keywordSearches: number;
    contentAnalyses: number;
    competitorReports: number;
    apiCalls: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
  limits: {
    neuroSeoAnalyses: number;
    keywordSearches: number;
    contentAnalyses: number;
    competitorReports: number;
    apiCalls: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
  overage: {
    neuroSeoAnalyses: number;
    keywordSearches: number;
    contentAnalyses: number;
    competitorReports: number;
    apiCalls: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface SystemMetricsDocument {
  id: string;
  date: string; // YYYY-MM-DD format
  metrics: {
    totalUsers: number;
    activeUsers: number;
    newSignups: number;
    churnRate: number;
    revenue: number;
    analysesPerformed: number;
    averageResponseTime: number;
    errorRate: number;
    systemUptime: number;
  };
  tierBreakdown: {
    free: { users: number; usage: number };
    starter: { users: number; usage: number; revenue: number };
    agency: { users: number; usage: number; revenue: number };
    enterprise: { users: number; usage: number; revenue: number };
  };
  featureUsage: {
    neuroSeoAnalyses: number;
    keywordResearch: number;
    contentAnalysis: number;
    competitorAnalysis: number;
    seoAudits: number;
  };
  createdAt: Timestamp;
}

// === DATA GENERATION CONSTANTS ===

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Education",
  "Real Estate",
  "Travel",
  "Food & Beverage",
  "Fashion",
  "Automotive",
  "Marketing",
  "Legal",
  "Manufacturing",
  "Energy",
  "Entertainment",
];

const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const GOALS = [
  "Increase organic traffic",
  "Improve search rankings",
  "Beat competitors",
  "Generate more leads",
  "Enhance content strategy",
  "Technical SEO optimization",
  "Local SEO improvement",
  "E-commerce SEO",
  "Brand awareness",
  "Conversion optimization",
];

const SAMPLE_DOMAINS = [
  "techstartup.com",
  "healthcareplus.com",
  "financepro.com",
  "shopnow.com",
  "learnfast.com",
  "realestate123.com",
  "travelmore.com",
  "foodie.com",
  "fashionfwd.com",
  "autoparts.com",
  "marketinggenius.com",
  "lawfirm.com",
  "manufacture.com",
  "greenergy.com",
  "entertainment.com",
];

const SAMPLE_KEYWORDS = [
  "digital marketing",
  "seo optimization",
  "content strategy",
  "web development",
  "online business",
  "social media",
  "email marketing",
  "conversion rate",
  "search engine optimization",
  "website design",
  "brand awareness",
  "lead generation",
  "competitor analysis",
  "keyword research",
  "link building",
  "technical seo",
];

// === DATA GENERATION FUNCTIONS ===

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateTimestamp(daysAgo: number): Timestamp {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return Timestamp.fromDate(date);
}

function generateUsageForTier(tier: string) {
  const baseLimits = {
    free: { analyses: 5, keywords: 100, content: 10, competitors: 0, api: 100 },
    starter: {
      analyses: 50,
      keywords: 1000,
      content: 100,
      competitors: 10,
      api: 1000,
    },
    agency: {
      analyses: 200,
      keywords: 5000,
      content: 500,
      competitors: 50,
      api: 5000,
    },
    enterprise: {
      analyses: -1,
      keywords: -1,
      content: -1,
      competitors: -1,
      api: 25000,
    },
    admin: {
      analyses: -1,
      keywords: -1,
      content: -1,
      competitors: -1,
      api: -1,
    },
  };

  const limits = baseLimits[tier as keyof typeof baseLimits];
  return {
    usage: {
      neuroSeoAnalyses:
        limits.analyses === -1
          ? Math.floor(Math.random() * 1000)
          : Math.floor(Math.random() * limits.analyses * 0.8),
      keywordSearches:
        limits.keywords === -1
          ? Math.floor(Math.random() * 10000)
          : Math.floor(Math.random() * limits.keywords * 0.7),
      contentAnalyses:
        limits.content === -1
          ? Math.floor(Math.random() * 2000)
          : Math.floor(Math.random() * limits.content * 0.6),
      competitorReports:
        limits.competitors === -1
          ? Math.floor(Math.random() * 200)
          : Math.floor(Math.random() * (limits.competitors + 1)),
      teamMembers:
        tier === "agency"
          ? Math.floor(Math.random() * 10)
          : tier === "enterprise"
            ? Math.floor(Math.random() * 50)
            : 1,
      apiCalls:
        limits.api === -1
          ? Math.floor(Math.random() * 20000)
          : Math.floor(Math.random() * limits.api * 0.5),
    },
    limits: {
      neuroSeoAnalyses: limits.analyses,
      keywordSearches: limits.keywords,
      contentAnalyses: limits.content,
      competitorReports: limits.competitors,
      teamMembers: tier === "agency" ? 10 : tier === "enterprise" ? 50 : 1,
      apiCalls: limits.api,
    },
  };
}

// === MAIN SEEDER CLASS ===

export class ComprehensiveDatabaseSeeder {
  private userIds: string[] = [];
  private projectIds: string[] = [];
  private teamIds: string[] = [];

  async seedAll() {
    console.log(
      "🌱 Continuing comprehensive database seeding from ContentAnalyses..."
    );
    console.log(
      "📊 Completed: Users ✅, Projects ✅, Teams ✅, NeuroSEO ✅, KeywordResearch ✅"
    );

    try {
      // POPULATE ARRAYS FROM EXISTING DATABASE
      console.log("📥 Loading existing user and project IDs from database...");
      await this.loadExistingIds();

      // SKIP COMPLETED SECTIONS
      console.log("⏭️  Skipping Users (18,530 already seeded)");
      console.log("⏭️  Skipping Projects (16,460 already seeded)");
      console.log("⏭️  Skipping Teams (268 already seeded)");
      console.log("⏭️  Skipping NeuroSEO (50,000 already seeded)");
      console.log("⏭️  Skipping KeywordResearch (13,159 already seeded)");
      console.log("⏭️  Skipping ContentAnalyses (11,000 already seeded)");
      console.log("⏭️  Skipping SEOAudits (4,476 already seeded)");
      console.log("⏭️  Skipping ContentBriefs (3,545 already seeded)");
      console.log("⏭️  Skipping CompetitorAnalyses (2,558 already seeded)");
      console.log("⏭️  Skipping SerpData (46 already seeded)");

      // CONTINUE FROM WHERE WE LEFT OFF
      await this.seedLinkAnalyses();
      await this.seedSerpData();
      await this.seedLinkAnalyses();
      await this.seedActivities();
      await this.seedBilling();
      await this.seedUsageTracking();
      await this.seedSystemMetrics();

      console.log("✅ Comprehensive database seeding completed successfully!");
      console.log(
        "📈 Generated realistic 1-year business data with full feature support"
      );
    } catch (error) {
      console.error("❌ Database seeding failed:", error);
      throw error;
    }
  }
  async loadExistingIds() {
    console.log("📥 Loading existing user IDs...");
    const usersSnapshot = await db.collection("users").get();
    this.userIds = usersSnapshot.docs.map((doc) => doc.id);
    console.log(`✅ Loaded ${this.userIds.length} user IDs`);

    console.log("📥 Loading existing project IDs...");
    const projectsSnapshot = await db.collection("projects").get();
    this.projectIds = projectsSnapshot.docs.map((doc) => doc.id);
    console.log(`✅ Loaded ${this.projectIds.length} project IDs`);

    console.log("📥 Loading existing team IDs...");
    const teamsSnapshot = await db.collection("teams").get();
    this.teamIds = teamsSnapshot.docs.map((doc) => doc.id);
    console.log(`✅ Loaded ${this.teamIds.length} team IDs`);
  }

  async seedUsers() {
    console.log("👥 Seeding 4,000 users across 5 tiers...");

    const userDistribution = {
      free: 2800, // 70%
      starter: 800, // 20%
      agency: 320, // 8%
      enterprise: 80, // 2%
      admin: 5, // Admins
    };

    let batch = db.batch();
    let totalUsers = 0;

    for (const [tier, count] of Object.entries(userDistribution)) {
      for (let i = 0; i < count; i++) {
        const userId = `user_${tier}_${i + 1}_${Date.now()}`;
        this.userIds.push(userId);

        const usageData = generateUsageForTier(tier);
        const createdDaysAgo = Math.floor(Math.random() * 365);

        const user: UserDocument = {
          uid: userId,
          email: `${tier}.user${i + 1}@rankpilot-demo.com`,
          displayName: `${tier.charAt(0).toUpperCase() + tier.slice(1)} User ${i + 1}`,
          role: tier as UserDocument["role"],
          subscriptionTier: tier as UserDocument["subscriptionTier"],
          subscriptionStatus: Math.random() > 0.05 ? "active" : "past_due", // 95% active
          subscriptionStartDate: generateTimestamp(createdDaysAgo),
          profile: {
            company: `${getRandomItem(INDUSTRIES)} Company ${i + 1}`,
            website: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
            industry: getRandomItem(INDUSTRIES),
            teamSize: getRandomItem(TEAM_SIZES),
            goals: getRandomItems(GOALS, Math.floor(Math.random() * 3) + 2),
            timezone: "UTC",
            language: "en",
          },
          preferences: {
            emailNotifications: Math.random() > 0.3,
            weeklyReports: Math.random() > 0.4,
            competitorAlerts: Math.random() > 0.6,
            seoRecommendations: Math.random() > 0.2,
            darkMode: Math.random() > 0.6,
            dashboardLayout: getRandomItem(["compact", "standard", "detailed"]),
          },
          usage: usageData.usage,
          limits: usageData.limits,
          lastLoginAt: generateTimestamp(Math.floor(Math.random() * 7)),
          createdAt: generateTimestamp(createdDaysAgo),
          updatedAt: generateTimestamp(Math.floor(Math.random() * 30)),
        };

        const userRef = db.collection("users").doc(userId);
        batch.set(userRef, user);
        totalUsers++;

        // Commit batch every 500 users
        if (totalUsers % 500 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalUsers}/4000 users...`);
          batch = db.batch(); // Create new batch after commit
        }
      }
    }

    // Commit remaining users
    if (totalUsers % 500 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalUsers} users`);
  }

  async seedProjects() {
    console.log("📂 Seeding user projects...");

    let batch = db.batch();
    let totalProjects = 0;

    for (const userId of this.userIds) {
      const projectCount = Math.floor(Math.random() * 3) + 1; // 1-3 projects per user

      for (let i = 0; i < projectCount; i++) {
        const projectId = `project_${userId}_${i + 1}`;
        this.projectIds.push(projectId);

        const project: ProjectDocument = {
          id: projectId,
          userId,
          name: `${getRandomItem(INDUSTRIES)} Project ${i + 1}`,
          domain: getRandomItem(SAMPLE_DOMAINS),
          url: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
          description: `SEO optimization project for ${getRandomItem(INDUSTRIES).toLowerCase()} business`,
          industry: getRandomItem(INDUSTRIES),
          targetMarkets: getRandomItems(
            ["US", "UK", "CA", "AU", "DE", "FR"],
            Math.floor(Math.random() * 3) + 1
          ),
          targetKeywords: getRandomItems(
            SAMPLE_KEYWORDS,
            Math.floor(Math.random() * 8) + 3
          ),
          competitors: getRandomItems(
            SAMPLE_DOMAINS,
            Math.floor(Math.random() * 5) + 2
          ),
          status: getRandomItem([
            "active",
            "active",
            "active",
            "paused",
            "archived",
          ]), // Most active
          settings: {
            crawlDepth: Math.floor(Math.random() * 3) + 1,
            analysisFrequency: getRandomItem(["daily", "weekly", "monthly"]),
            alertThresholds: {
              rankingDrop: Math.floor(Math.random() * 5) + 5,
              trafficDrop: Math.floor(Math.random() * 20) + 10,
              errorIncrease: Math.floor(Math.random() * 10) + 5,
            },
          },
          lastAnalyzedAt: generateTimestamp(Math.floor(Math.random() * 30)),
          createdAt: generateTimestamp(Math.floor(Math.random() * 300)),
          updatedAt: generateTimestamp(Math.floor(Math.random() * 7)),
        };

        const projectRef = db.collection("projects").doc(projectId);
        batch.set(projectRef, project);
        totalProjects++;

        if (totalProjects % 500 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalProjects} projects...`);
          batch = db.batch(); // NEW BATCH INSTANCE
        }
      }
    }

    if (totalProjects % 500 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalProjects} projects`);
  }

  async seedTeams() {
    console.log("👥 Seeding team collaboration data...");

    let batch = db.batch();
    let totalTeams = 0;

    // Only agency and enterprise users have teams
    const teamEligibleUsers = this.userIds.filter(
      (userId) => userId.includes("agency") || userId.includes("enterprise")
    );

    for (let i = 0; i < Math.min(teamEligibleUsers.length / 3, 150); i++) {
      const teamId = `team_${Date.now()}_${i}`;
      this.teamIds.push(teamId);

      const ownerId = getRandomItem(teamEligibleUsers);
      const memberCount = Math.floor(Math.random() * 8) + 2; // 2-10 members
      const members = getRandomItems(teamEligibleUsers, memberCount);

      const team: TeamDocument = {
        id: teamId,
        ownerId,
        name: `${getRandomItem(INDUSTRIES)} Team ${i + 1}`,
        description: `Collaborative SEO team for ${getRandomItem(INDUSTRIES).toLowerCase()} projects`,
        plan: getRandomItem(["agency", "enterprise"]),
        members: members.map((userId) => ({
          userId,
          email: `user-${userId}@rankpilot-demo.com`,
          role:
            userId === ownerId
              ? "owner"
              : getRandomItem(["admin", "editor", "viewer"]),
          joinedAt: generateTimestamp(Math.floor(Math.random() * 200)),
          permissions: ["read_projects", "create_analyses", "export_reports"],
        })),
        projects: getRandomItems(
          this.projectIds,
          Math.floor(Math.random() * 5) + 1
        ),
        settings: {
          allowInvites: Math.random() > 0.3,
          requireApproval: Math.random() > 0.5,
          brandingEnabled: Math.random() > 0.7,
          reportSharing: Math.random() > 0.2,
        },
        usage: {
          totalAnalyses: Math.floor(Math.random() * 500) + 50,
          totalReports: Math.floor(Math.random() * 200) + 20,
          storageUsed: Math.floor(Math.random() * 10000) + 1000, // MB
        },
        createdAt: generateTimestamp(Math.floor(Math.random() * 250)),
        updatedAt: generateTimestamp(Math.floor(Math.random() * 7)),
      };

      const teamRef = db.collection("teams").doc(teamId);
      batch.set(teamRef, team);
      totalTeams++;

      if (totalTeams % 100 === 0) {
        await batch.commit();
        batch = db.batch(); // NEW BATCH INSTANCE
        console.log(`  ✅ Seeded ${totalTeams} teams...`);
      }
    }

    if (totalTeams % 100 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalTeams} teams`);
  }

  // Additional seeding methods will be implemented...
  // Due to length constraints, I'll provide the structure for the remaining methods

  async seedNeuroSeoAnalyses() {
    console.log("🧠 Seeding NeuroSEO™ analyses (50,000 target)...");

    let batch = db.batch();
    let totalAnalyses = 0;
    const targetAnalyses = 50000;

    for (const userId of this.userIds) {
      const userProjects = this.projectIds.filter((id) =>
        id.includes(userId.split("_")[1])
      );
      const analysisCount = Math.floor(Math.random() * 20) + 5; // 5-25 analyses per user

      for (let i = 0; i < analysisCount; i++) {
        const analysisId = `analysis_${userId}_${Date.now()}_${i}`;
        const projectId =
          userProjects[Math.floor(Math.random() * userProjects.length)];

        const analysis: NeuroSeoAnalysisDocument = {
          id: analysisId,
          userId,
          projectId,
          analysisType: getRandomItem([
            "comprehensive",
            "quick",
            "competitor",
            "content",
          ]),
          urls: [getRandomItem(SAMPLE_DOMAINS)],
          targetKeywords: getRandomItems(
            SAMPLE_KEYWORDS,
            Math.floor(Math.random() * 5) + 1
          ),
          engines: {
            neuralCrawler: {
              status: "completed",
              results: {
                pages: [
                  {
                    url: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
                    title: `${getRandomItem(SAMPLE_KEYWORDS)} - Professional Services`,
                    metaDescription: `Learn about ${getRandomItem(SAMPLE_KEYWORDS)} with expert insights.`,
                    content: `Comprehensive content about ${getRandomItem(SAMPLE_KEYWORDS)}...`,
                    headings: {
                      h1: [`Main ${getRandomItem(SAMPLE_KEYWORDS)} Guide`],
                      h2: ["Overview", "Benefits", "Implementation"],
                    },
                    images: [
                      {
                        src: "/image.jpg",
                        alt: getRandomItem(SAMPLE_KEYWORDS),
                      },
                    ],
                    links: [
                      {
                        href: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
                        text: "Learn More",
                        type: "external",
                      },
                    ],
                    technicalIssues:
                      Math.random() > 0.7
                        ? ["Missing alt tags", "Slow loading"]
                        : [],
                  },
                ],
                siteStructure: {
                  totalPages: Math.floor(Math.random() * 1000) + 50,
                  uniquePages: Math.floor(Math.random() * 900) + 45,
                  duplicateContent: Math.floor(Math.random() * 10),
                  orphanPages: Math.floor(Math.random() * 20),
                },
              },
              executionTime: Math.floor(Math.random() * 5000) + 1000,
            },
            semanticMap: {
              status: "completed",
              results: {
                topicClusters: [
                  {
                    topic: getRandomItem(SAMPLE_KEYWORDS),
                    keywords: getRandomItems(SAMPLE_KEYWORDS, 3),
                    contentGaps: ["Advanced techniques", "Case studies"],
                    relatedTopics: getRandomItems(SAMPLE_KEYWORDS, 2),
                    semanticScore: Math.floor(Math.random() * 40) + 60,
                  },
                ],
                keywordDensity: {
                  [getRandomItem(SAMPLE_KEYWORDS)]: Math.random() * 3 + 1,
                },
                readabilityScore: Math.floor(Math.random() * 30) + 70,
                contentDepth: Math.floor(Math.random() * 30) + 70,
              },
              executionTime: Math.floor(Math.random() * 3000) + 500,
            },
            aiVisibilityEngine: {
              status: "completed",
              results: {
                aiCitations: [
                  {
                    aiPlatform: getRandomItem([
                      "ChatGPT",
                      "Claude",
                      "Gemini",
                      "Perplexity",
                    ]),
                    citationCount: Math.floor(Math.random() * 50) + 1,
                    citationContext: ["AI assistance", "Information source"],
                    citationQuality: getRandomItem(["high", "medium", "low"]),
                  },
                ],
                visibilityScore: Math.floor(Math.random() * 40) + 60,
                optimizationSuggestions: [
                  "Improve E-A-T signals",
                  "Add structured data",
                ],
                competitorComparison: [
                  {
                    competitor: getRandomItem(SAMPLE_DOMAINS),
                    visibilityScore: Math.floor(Math.random() * 100),
                    citations: Math.floor(Math.random() * 100),
                  },
                ],
              },
              executionTime: Math.floor(Math.random() * 4000) + 1000,
            },
            trustBlock: {
              status: "completed",
              results: {
                eatScore: {
                  expertise: Math.floor(Math.random() * 40) + 60,
                  authoritativeness: Math.floor(Math.random() * 40) + 60,
                  trustworthiness: Math.floor(Math.random() * 40) + 60,
                  overall: Math.floor(Math.random() * 40) + 60,
                },
                trustSignals: [
                  {
                    signal: "Author Bio",
                    status: getRandomItem(["present", "missing", "weak"]),
                    impact: getRandomItem(["high", "medium", "low"]),
                    recommendations: ["Add detailed author biography"],
                  },
                ],
                authorCredibility: {
                  authorBio: Math.random() > 0.5,
                  credentials: Math.random() > 0.6,
                  linkedinProfile: Math.random() > 0.7,
                  authorPhoto: Math.random() > 0.8,
                },
              },
              executionTime: Math.floor(Math.random() * 2000) + 500,
            },
            rewriteGen: {
              status: "completed",
              results: {
                contentSuggestions: [
                  {
                    section: "Introduction",
                    originalText: "Basic introduction text...",
                    suggestedText:
                      "Enhanced introduction with SEO optimization...",
                    improvementType: getRandomItem([
                      "seo",
                      "readability",
                      "engagement",
                      "conversion",
                    ]),
                    confidence: Math.random() * 0.4 + 0.6,
                  },
                ],
                titleSuggestions: [
                  `Best ${getRandomItem(SAMPLE_KEYWORDS)} Guide 2025`,
                ],
                metaDescriptionSuggestions: [
                  `Learn ${getRandomItem(SAMPLE_KEYWORDS)} with expert tips`,
                ],
                overallImprovementScore: Math.floor(Math.random() * 40) + 60,
              },
              executionTime: Math.floor(Math.random() * 3000) + 1000,
            },
            orchestrator: {
              status: "completed",
              results: {
                overallScore: Math.floor(Math.random() * 40) + 60,
                priorityActions: [
                  {
                    action: "Optimize page load speed",
                    impact: getRandomItem(["high", "medium", "low"]),
                    effort: getRandomItem(["high", "medium", "low"]),
                    timeline: "2-4 weeks",
                  },
                ],
                competitiveAnalysis: {
                  strengthsVsCompetitors: [
                    "Better content depth",
                    "Superior user experience",
                  ],
                  weaknessesVsCompetitors: [
                    "Lower domain authority",
                    "Fewer backlinks",
                  ],
                  opportunities: [
                    "Content gap exploitation",
                    "Technical SEO improvements",
                  ],
                  threats: [
                    "Aggressive competitor strategies",
                    "Algorithm changes",
                  ],
                },
              },
              executionTime: Math.floor(Math.random() * 2000) + 500,
            },
          },
          summary: {
            overallScore: Math.floor(Math.random() * 40) + 60,
            keyFindings: [
              "Content optimization needed",
              "Technical issues found",
            ],
            quickWins: ["Fix meta descriptions", "Optimize images"],
            longTermStrategy: ["Build domain authority", "Content expansion"],
            estimatedImpact: "Medium-High",
          },
          status: "completed",
          createdAt: generateTimestamp(Math.floor(Math.random() * 90)),
          completedAt: generateTimestamp(Math.floor(Math.random() * 89)),
          executionTime: Math.floor(Math.random() * 10000) + 5000,
        };

        const analysisRef = db.collection("neuroSeoAnalyses").doc(analysisId);
        batch.set(analysisRef, analysis);
        totalAnalyses++;

        if (totalAnalyses % 500 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(
            `  ✅ Seeded ${totalAnalyses}/${targetAnalyses} NeuroSEO analyses...`
          );
        }

        if (totalAnalyses >= targetAnalyses) break;
      }
      if (totalAnalyses >= targetAnalyses) break;
    }

    if (totalAnalyses % 500 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalAnalyses} NeuroSEO analyses`);
  }

  async seedKeywordResearch() {
    console.log("🔍 Seeding keyword research data...");

    let batch = db.batch();
    let totalResearch = 0;

    for (const userId of this.userIds.slice(0, 2000)) {
      // Limit for performance
      const researchCount = Math.floor(Math.random() * 10) + 2; // 2-12 research per user

      for (let i = 0; i < researchCount; i++) {
        const researchId = `research_${userId}_${Date.now()}_${i}`;
        const seedKeyword = getRandomItem(SAMPLE_KEYWORDS);

        const research: KeywordResearchDocument = {
          id: researchId,
          userId,
          projectId: getRandomItem(this.projectIds),
          seedKeyword,
          targetLocation: getRandomItem(["US", "UK", "CA", "AU"]),
          language: "en",
          results: Array.from(
            { length: Math.floor(Math.random() * 50) + 20 },
            (_, index) => ({
              keyword: `${seedKeyword} ${getRandomItem(["tips", "guide", "best", "how to", "free", "online", "2025"])}`,
              searchVolume: Math.floor(Math.random() * 50000) + 100,
              competition: getRandomItem(["low", "medium", "high"]),
              cpc: Math.random() * 10 + 0.5,
              difficulty: Math.floor(Math.random() * 100) + 1,
              trend: Array.from({ length: 12 }, (_, monthIndex) => ({
                month: `2024-${String(monthIndex + 1).padStart(2, "0")}`,
                volume: Math.floor(Math.random() * 10000) + 500,
              })),
              relatedKeywords: getRandomItems(SAMPLE_KEYWORDS, 3),
              questions: [
                `What is ${seedKeyword}?`,
                `How to improve ${seedKeyword}?`,
              ],
              intent: getRandomItem([
                "informational",
                "commercial",
                "transactional",
                "navigational",
              ]),
            })
          ),
          filters: {
            minSearchVolume: 100,
            maxDifficulty: 80,
            maxCpc: 15.0,
          },
          totalResults: Math.floor(Math.random() * 100) + 50,
          createdAt: generateTimestamp(Math.floor(Math.random() * 60)),
        };

        const researchRef = db.collection("keywordResearch").doc(researchId);
        batch.set(researchRef, research);
        totalResearch++;

        if (totalResearch % 100 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(
            `  ✅ Seeded ${totalResearch} keyword research entries...`
          );
        }
      }
    }

    if (totalResearch % 100 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(
      `✅ Successfully seeded ${totalResearch} keyword research entries`
    );
  }

  async seedContentAnalyses() {
    console.log("📝 Seeding content analysis data...");

    let batch = db.batch();
    let totalAnalyses = 0;

    for (const userId of this.userIds.slice(0, 2000)) {
      // Limit for performance
      const analysisCount = Math.floor(Math.random() * 8) + 2; // 2-10 analyses per user

      for (let i = 0; i < analysisCount; i++) {
        const analysisId = `content_${userId}_${Date.now()}_${i}`;
        const targetUrl = `https://${getRandomItem(SAMPLE_DOMAINS)}`;
        const keyword = getRandomItem(SAMPLE_KEYWORDS);

        const analysis: ContentAnalysisDocument = {
          id: analysisId,
          userId,
          projectId: getRandomItem(this.projectIds),
          url: targetUrl,
          content: `This is comprehensive content about ${keyword}. It includes detailed analysis, best practices, and actionable insights for businesses looking to improve their ${keyword} strategy. The content covers various aspects including implementation, measurement, and optimization techniques.`,
          analysis: {
            readabilityScore: Math.floor(Math.random() * 30) + 70,
            seoScore: Math.floor(Math.random() * 40) + 60,
            wordCount: Math.floor(Math.random() * 2000) + 800,
            readingTime: Math.floor(Math.random() * 8) + 3,
            keywordDensity: {
              [keyword]: Math.random() * 2 + 1,
              [getRandomItem(SAMPLE_KEYWORDS)]: Math.random() * 1.5 + 0.5,
              [getRandomItem(SAMPLE_KEYWORDS)]: Math.random() * 1 + 0.3,
            },
            headingStructure: {
              h1: Math.floor(Math.random() * 2) + 1,
              h2: Math.floor(Math.random() * 6) + 3,
              h3: Math.floor(Math.random() * 8) + 2,
              h4: Math.floor(Math.random() * 5),
              h5: Math.floor(Math.random() * 3),
              h6: Math.floor(Math.random() * 2),
            },
            technicalSeo: {
              titleTag: {
                present: Math.random() > 0.1,
                length: Math.floor(Math.random() * 30) + 40,
                optimized: Math.random() > 0.3,
              },
              metaDescription: {
                present: Math.random() > 0.2,
                length: Math.floor(Math.random() * 60) + 120,
                optimized: Math.random() > 0.4,
              },
              altTags: {
                total: Math.floor(Math.random() * 10) + 5,
                missing: Math.floor(Math.random() * 3),
                optimized: Math.floor(Math.random() * 8) + 2,
              },
              internalLinks: Math.floor(Math.random() * 15) + 5,
              externalLinks: Math.floor(Math.random() * 8) + 2,
            },
            contentQuality: {
              originalityScore: Math.floor(Math.random() * 30) + 70,
              expertiseLevel: getRandomItem([
                "beginner",
                "intermediate",
                "expert",
              ]),
              topicDepth: Math.floor(Math.random() * 40) + 60,
              sentimentScore: Math.random() * 0.6 + 0.2,
            },
            improvementSuggestions: Array.from(
              { length: Math.floor(Math.random() * 6) + 3 },
              () => ({
                category: getRandomItem([
                  "seo",
                  "readability",
                  "content",
                  "technical",
                ]),
                suggestion: `Improve ${getRandomItem(["keyword density", "heading structure", "internal linking", "content depth", "meta descriptions", "image optimization"])}`,
                priority: getRandomItem(["high", "medium", "low"]),
                estimatedImpact: getRandomItem([
                  "High - significant traffic increase",
                  "Medium - moderate improvement",
                  "Low - minor optimization",
                ]),
              })
            ),
          },
          createdAt: generateTimestamp(Math.floor(Math.random() * 120)),
        };

        const analysisRef = db.collection("contentAnalyses").doc(analysisId);
        batch.set(analysisRef, analysis);
        totalAnalyses++;

        if (totalAnalyses % 100 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalAnalyses} content analyses...`);
        }
      }
    }

    if (totalAnalyses % 100 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalAnalyses} content analyses`);
  }

  async seedSeoAudits() {
    console.log("🔧 Seeding SEO audit data...");

    let batch = db.batch();
    let totalAudits = 0;

    for (const userId of this.userIds.slice(0, 1500)) {
      // Limit for performance
      const auditCount = Math.floor(Math.random() * 5) + 1; // 1-6 audits per user

      for (let i = 0; i < auditCount; i++) {
        const auditId = `audit_${userId}_${Date.now()}_${i}`;

        const audit: SeoAuditDocument = {
          id: auditId,
          userId,
          projectId: getRandomItem(this.projectIds),
          url: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
          auditType: getRandomItem([
            "technical",
            "content",
            "performance",
            "comprehensive",
          ]),
          results: {
            overallScore: Math.floor(Math.random() * 40) + 60,
            technical: {
              score: Math.floor(Math.random() * 40) + 60,
              issues: Array.from(
                { length: Math.floor(Math.random() * 8) + 2 },
                () => ({
                  type: getRandomItem([
                    "Missing meta description",
                    "Slow loading speed",
                    "Mobile issues",
                    "Broken links",
                  ]),
                  severity: getRandomItem(["critical", "warning", "notice"]),
                  description: "Technical issue detected during audit",
                  recommendation: "Fix this issue to improve SEO performance",
                  affectedPages: Math.floor(Math.random() * 20) + 1,
                })
              ),
              metrics: {
                loadTime: Math.random() * 5 + 1,
                mobileSpeed: Math.floor(Math.random() * 40) + 60,
                desktopSpeed: Math.floor(Math.random() * 40) + 60,
                coreWebVitals: {
                  lcp: Math.random() * 3 + 1,
                  fid: Math.random() * 200 + 50,
                  cls: Math.random() * 0.2 + 0.05,
                },
              },
            },
            onPage: {
              score: Math.floor(Math.random() * 40) + 60,
              titleTags: {
                optimized: Math.floor(Math.random() * 80) + 20,
                total: 100,
                issues: ["Missing title tags"],
              },
              metaDescriptions: {
                optimized: Math.floor(Math.random() * 70) + 30,
                total: 100,
                issues: ["Too long"],
              },
              headings: {
                proper: Math.floor(Math.random() * 90) + 10,
                total: 100,
                issues: ["H1 missing"],
              },
              content: {
                quality: Math.floor(Math.random() * 30) + 70,
                uniqueness: Math.floor(Math.random() * 20) + 80,
                issues: [],
              },
            },
            offPage: {
              score: Math.floor(Math.random() * 40) + 60,
              backlinks: {
                total: Math.floor(Math.random() * 5000) + 100,
                quality: Math.floor(Math.random() * 30) + 70,
                toxic: Math.floor(Math.random() * 50),
              },
              domainAuthority: Math.floor(Math.random() * 40) + 40,
              linkProfile: {
                follow: Math.floor(Math.random() * 1000) + 50,
                nofollow: Math.floor(Math.random() * 500) + 20,
                domains: Math.floor(Math.random() * 200) + 10,
                anchors: {
                  "brand name": 30,
                  generic: 25,
                  "exact match": 15,
                  partial: 20,
                  other: 10,
                },
              },
            },
          },
          recommendations: Array.from(
            { length: Math.floor(Math.random() * 8) + 3 },
            (_, index) => ({
              category: getRandomItem(["technical", "content", "links"]),
              priority: index + 1,
              title: `Recommendation ${index + 1}`,
              description: "Detailed recommendation for improvement",
              effort: getRandomItem(["low", "medium", "high"]),
              impact: getRandomItem(["low", "medium", "high"]),
              estimatedTime: getRandomItem([
                "1-2 hours",
                "1-2 days",
                "1-2 weeks",
              ]),
            })
          ),
          createdAt: generateTimestamp(Math.floor(Math.random() * 120)),
        };

        const auditRef = db.collection("seoAudits").doc(auditId);
        batch.set(auditRef, audit);
        totalAudits++;

        if (totalAudits % 200 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalAudits} SEO audits...`);
        }
      }
    }

    if (totalAudits % 200 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalAudits} SEO audits`);
  }

  async seedContentBriefs() {
    console.log("📋 Seeding content brief data...");

    let batch = db.batch();
    let totalBriefs = 0;

    for (const userId of this.userIds.slice(0, 1200)) {
      // Limit for performance
      const briefCount = Math.floor(Math.random() * 5) + 1; // 1-6 briefs per user

      for (let i = 0; i < briefCount; i++) {
        const briefId = `brief_${userId}_${Date.now()}_${i}`;
        const targetKeyword = getRandomItem(SAMPLE_KEYWORDS);
        const contentType = getRandomItem([
          "blog",
          "landing",
          "product",
          "guide",
          "comparison",
        ] as const);

        const brief: ContentBriefDocument = {
          id: briefId,
          userId,
          projectId: getRandomItem(this.projectIds),
          targetKeyword,
          contentType,
          brief: {
            title: `Complete ${targetKeyword} ${contentType === "blog" ? "Guide" : "Strategy"} for 2025`,
            metaDescription: `Discover the best ${targetKeyword} strategies and techniques. Expert insights and proven methods for success.`,
            outline: Array.from(
              { length: Math.floor(Math.random() * 6) + 4 },
              (_, index) => ({
                heading: `${index + 1}. ${getRandomItem(["Understanding", "Implementing", "Optimizing", "Measuring", "Advanced"])} ${targetKeyword}`,
                subheadings: getRandomItems(
                  [
                    "Key concepts",
                    "Best practices",
                    "Common mistakes",
                    "Tools and resources",
                    "Case studies",
                  ],
                  3
                ),
                keyPoints: getRandomItems(
                  [
                    "Strategy implementation",
                    "Performance metrics",
                    "Cost optimization",
                    "User experience",
                    "Technical requirements",
                  ],
                  3
                ),
                wordCount: Math.floor(Math.random() * 400) + 200,
              })
            ),
            targetAudience: {
              demographics: `${getRandomItem(["Small business owners", "Marketing professionals", "Enterprise teams", "Freelancers", "Agencies"])} interested in ${targetKeyword}`,
              painPoints: [
                `Struggling with ${targetKeyword} implementation`,
                "Limited budget for optimization",
                "Lack of technical expertise",
                "Measuring ROI effectively",
              ],
              goals: [
                `Improve ${targetKeyword} performance`,
                "Increase conversion rates",
                "Reduce operational costs",
                "Scale business operations",
              ],
              expertiseLevel: getRandomItem([
                "beginner",
                "intermediate",
                "expert",
              ]),
            },
            seoGuidelines: {
              primaryKeyword: targetKeyword,
              secondaryKeywords: getRandomItems(SAMPLE_KEYWORDS, 4),
              semanticKeywords: getRandomItems(
                [
                  `${targetKeyword} strategy`,
                  `best ${targetKeyword}`,
                  `${targetKeyword} tips`,
                  `${targetKeyword} guide`,
                  `${targetKeyword} optimization`,
                  `${targetKeyword} tools`,
                ],
                6
              ),
              keywordDensity: Math.random() * 1.5 + 1,
              targetWordCount: Math.floor(Math.random() * 2000) + 1500,
            },
            competitorAnalysis: Array.from(
              { length: Math.floor(Math.random() * 4) + 2 },
              () => ({
                url: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
                title: `${getRandomItem(SAMPLE_KEYWORDS)} - ${getRandomItem(["Complete Guide", "Best Practices", "Expert Tips"])}`,
                wordCount: Math.floor(Math.random() * 2000) + 1000,
                strengths: getRandomItems(
                  [
                    "Comprehensive coverage",
                    "Great examples",
                    "Clear structure",
                    "Expert insights",
                  ],
                  2
                ),
                weaknesses: getRandomItems(
                  [
                    "Lacks depth",
                    "Outdated information",
                    "Poor formatting",
                    "Missing examples",
                  ],
                  2
                ),
                contentGaps: getRandomItems(
                  [
                    "Technical implementation",
                    "Case studies",
                    "ROI metrics",
                    "Advanced strategies",
                  ],
                  2
                ),
              })
            ),
            callsToAction: [
              "Start your free trial today",
              "Download our comprehensive guide",
              "Schedule a consultation",
              "Get started with our platform",
            ],
            internalLinkSuggestions: getRandomItems(
              [
                "/blog/getting-started",
                "/guides/advanced-techniques",
                "/tools/calculator",
                "/case-studies",
                "/pricing",
                "/contact",
              ],
              4
            ),
            externalReferences: getRandomItems(
              [
                "https://research.example.com/study",
                "https://industry.report.com",
                "https://stats.platform.com",
                "https://expert.blog.com/insights",
              ],
              3
            ),
          },
          status: getRandomItem([
            "draft",
            "approved",
            "in_progress",
            "completed",
          ]),
          createdAt: generateTimestamp(Math.floor(Math.random() * 90)),
          updatedAt: generateTimestamp(Math.floor(Math.random() * 30)),
        };

        const briefRef = db.collection("contentBriefs").doc(briefId);
        batch.set(briefRef, brief);
        totalBriefs++;

        if (totalBriefs % 200 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalBriefs} content briefs...`);
        }
      }
    }

    if (totalBriefs % 200 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalBriefs} content briefs`);
  }

  async seedCompetitorAnalyses() {
    console.log("🎯 Seeding competitor analysis data...");

    let batch = db.batch();
    let totalAnalyses = 0;

    for (const userId of this.userIds.slice(0, 1000)) {
      // Limit for performance
      const analysisCount = Math.floor(Math.random() * 4) + 1; // 1-5 analyses per user

      for (let i = 0; i < analysisCount; i++) {
        const analysisId = `competitor_${userId}_${Date.now()}_${i}`;
        const competitors = getRandomItems(
          SAMPLE_DOMAINS,
          Math.floor(Math.random() * 4) + 2
        );

        const analysis: CompetitorAnalysisDocument = {
          id: analysisId,
          userId,
          projectId: getRandomItem(this.projectIds),
          competitors,
          analysis: {
            overview: competitors.map((domain) => ({
              domain,
              domainAuthority: Math.floor(Math.random() * 60) + 30,
              organicTraffic: Math.floor(Math.random() * 500000) + 10000,
              organicKeywords: Math.floor(Math.random() * 10000) + 1000,
              backlinks: Math.floor(Math.random() * 50000) + 5000,
              estimatedValue: Math.floor(Math.random() * 100000) + 10000,
            })),
            keywordGaps: Array.from(
              { length: Math.floor(Math.random() * 20) + 10 },
              () => {
                const keyword = getRandomItem(SAMPLE_KEYWORDS);
                const competitorRanks: Record<string, number> = {};
                competitors.forEach((comp) => {
                  competitorRanks[comp] = Math.floor(Math.random() * 100) + 1;
                });

                return {
                  keyword,
                  userRank: Math.floor(Math.random() * 100) + 1,
                  competitorRanks,
                  searchVolume: Math.floor(Math.random() * 50000) + 500,
                  difficulty: Math.floor(Math.random() * 100) + 1,
                  opportunity: getRandomItem(["high", "medium", "low"]),
                };
              }
            ),
            contentGaps: Array.from(
              { length: Math.floor(Math.random() * 15) + 5 },
              () => {
                const topic = `${getRandomItem(SAMPLE_KEYWORDS)} ${getRandomItem(["strategies", "techniques", "best practices", "guide", "tips"])}`;
                const competitorCoverage: Record<string, boolean> = {};
                competitors.forEach((comp) => {
                  competitorCoverage[comp] = Math.random() > 0.4;
                });

                return {
                  topic,
                  competitorCoverage,
                  searchVolume: Math.floor(Math.random() * 20000) + 1000,
                  priority: getRandomItem(["high", "medium", "low"]),
                  suggestedContent: [
                    `Complete guide to ${topic}`,
                    `${topic} case studies`,
                    `Advanced ${topic} techniques`,
                  ],
                };
              }
            ),
            backLinkGaps: Array.from(
              { length: Math.floor(Math.random() * 12) + 8 },
              () => ({
                domain: getRandomItem(SAMPLE_DOMAINS),
                domainAuthority: Math.floor(Math.random() * 70) + 20,
                linkingTo: getRandomItems(
                  competitors,
                  Math.floor(Math.random() * 3) + 1
                ),
                linkingToUser: Math.random() > 0.7,
                opportunity: getRandomItem(["high", "medium", "low"]),
              })
            ),
            swotAnalysis: {
              strengths: getRandomItems(
                [
                  "Strong brand recognition",
                  "High-quality content",
                  "Excellent user experience",
                  "Strong backlink profile",
                  "Active social media presence",
                  "Technical SEO optimization",
                ],
                4
              ),
              weaknesses: getRandomItems(
                [
                  "Limited content variety",
                  "Slow page load speeds",
                  "Poor mobile optimization",
                  "Weak social media engagement",
                  "Limited keyword coverage",
                  "Outdated content",
                ],
                3
              ),
              opportunities: getRandomItems(
                [
                  "Untapped keyword opportunities",
                  "Content gap exploitation",
                  "Emerging market trends",
                  "New platform expansion",
                  "Partnership opportunities",
                  "Technology improvements",
                ],
                4
              ),
              threats: getRandomItems(
                [
                  "Increasing competition",
                  "Algorithm changes",
                  "Market saturation",
                  "Negative brand mentions",
                  "Technical vulnerabilities",
                  "Changing user behavior",
                ],
                3
              ),
            },
          },
          createdAt: generateTimestamp(Math.floor(Math.random() * 180)),
        };

        const analysisRef = db.collection("competitorAnalyses").doc(analysisId);
        batch.set(analysisRef, analysis);
        totalAnalyses++;

        if (totalAnalyses % 150 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalAnalyses} competitor analyses...`);
        }
      }
    }

    if (totalAnalyses % 150 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalAnalyses} competitor analyses`);
  }

  async seedSerpData() {
    console.log("📊 Seeding SERP data...");

    let batch = db.batch();
    let totalSerp = 0;

    // Generate SERP data for most popular keywords
    for (const keyword of SAMPLE_KEYWORDS) {
      const locations = ["US", "UK", "CA", "AU", "DE"];

      for (const location of locations.slice(
        0,
        Math.floor(Math.random() * 3) + 2
      )) {
        const serpId = `serp_${keyword.replace(/\s+/g, "_")}_${location}_${Date.now()}`;

        const serp: SerpDataDocument = {
          id: serpId,
          keyword,
          location,
          language: "en",
          searchEngine: getRandomItem(["google", "bing", "yahoo"]),
          results: Array.from({ length: 10 }, (_, index) => ({
            position: index + 1,
            url: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
            title: `${keyword} - ${getRandomItem(["Complete Guide", "Best Practices", "Expert Tips", "Professional Services", "Solutions"])}`,
            description: `Discover the best ${keyword} strategies and techniques. Expert insights and proven methods for ${keyword} success in ${new Date().getFullYear()}.`,
            domain: getRandomItem(SAMPLE_DOMAINS),
            features:
              Math.random() > 0.7
                ? getRandomItems(
                    [
                      "featured_snippet",
                      "people_also_ask",
                      "image_pack",
                      "video",
                    ],
                    2
                  )
                : [],
          })),
          features: {
            ...(Math.random() > 0.6 && {
              featuredSnippet: {
                url: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
                content: `${keyword} is a crucial aspect of modern business strategy. It involves implementing best practices to achieve optimal results and drive sustainable growth.`,
              },
            }),
            ...(Math.random() > 0.5 && {
              peopleAlsoAsk: [
                `What is ${keyword}?`,
                `How to improve ${keyword}?`,
                `Best ${keyword} tools`,
                `${keyword} vs alternatives`,
              ],
            }),
            ...(Math.random() > 0.7 && {
              relatedSearches: [
                `${keyword} guide`,
                `best ${keyword}`,
                `${keyword} tips`,
                `${keyword} strategy`,
              ],
            }),
          },
          searchVolume: Math.floor(Math.random() * 100000) + 1000,
          difficulty: Math.floor(Math.random() * 100) + 1,
          createdAt: generateTimestamp(Math.floor(Math.random() * 30)),
        };

        const serpRef = db.collection("serpData").doc(serpId);
        batch.set(serpRef, serp);
        totalSerp++;

        if (totalSerp % 100 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalSerp} SERP entries...`);
        }
      }
    }

    if (totalSerp % 100 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalSerp} SERP data entries`);
  }

  async seedLinkAnalyses() {
    console.log("🔗 Seeding link analysis data...");

    let batch = db.batch();
    let totalAnalyses = 0;

    for (const userId of this.userIds.slice(0, 800)) {
      // Limit for performance
      const analysisCount = Math.floor(Math.random() * 3) + 1; // 1-4 analyses per user

      for (let i = 0; i < analysisCount; i++) {
        const analysisId = `link_${userId}_${Date.now()}_${i}`;
        const targetUrl = `https://${getRandomItem(SAMPLE_DOMAINS)}`;

        const totalBacklinks = Math.floor(Math.random() * 10000) + 100;
        const uniqueDomains = Math.floor(totalBacklinks * 0.3) + 20;
        const toxicLinks = Math.floor(totalBacklinks * 0.05);

        const analysis: LinkAnalysisDocument = {
          id: analysisId,
          userId,
          projectId: getRandomItem(this.projectIds),
          targetUrl,
          analysis: {
            summary: {
              totalBacklinks,
              uniqueDomains,
              domainAuthority: Math.floor(Math.random() * 70) + 20,
              toxicLinks,
              qualityScore: Math.floor(Math.random() * 40) + 60,
            },
            backlinks: Array.from(
              { length: Math.min(totalBacklinks, 100) },
              () => ({
                sourceUrl: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
                sourceDomain: getRandomItem(SAMPLE_DOMAINS),
                domainAuthority: Math.floor(Math.random() * 80) + 15,
                anchorText: getRandomItem([
                  getRandomItem(SAMPLE_KEYWORDS),
                  "click here",
                  "read more",
                  "visit website",
                  getRandomItem(SAMPLE_DOMAINS).split(".")[0],
                  `best ${getRandomItem(SAMPLE_KEYWORDS)}`,
                ]),
                linkType: getRandomItem(["follow", "nofollow"]),
                linkQuality: getRandomItem(["high", "medium", "low", "toxic"]),
                firstSeen: generateTimestamp(Math.floor(Math.random() * 365)),
                lastSeen: generateTimestamp(Math.floor(Math.random() * 30)),
              })
            ),
            opportunities: Array.from(
              { length: Math.floor(Math.random() * 20) + 10 },
              () => ({
                domain: getRandomItem(SAMPLE_DOMAINS),
                domainAuthority: Math.floor(Math.random() * 70) + 25,
                relevanceScore: Math.floor(Math.random() * 40) + 60,
                contactInfo: `contact@${getRandomItem(SAMPLE_DOMAINS)}`,
                outreachStatus: getRandomItem([
                  "not_contacted",
                  "contacted",
                  "responded",
                  "link_acquired",
                ]),
              })
            ),
            anchorTextDistribution: {
              "Brand name": Math.floor(Math.random() * 30) + 20,
              Generic: Math.floor(Math.random() * 25) + 15,
              "Exact match": Math.floor(Math.random() * 15) + 5,
              "Partial match": Math.floor(Math.random() * 20) + 10,
              Other: Math.floor(Math.random() * 15) + 10,
            },
            domainDistribution: SAMPLE_DOMAINS.slice(0, 10).reduce(
              (acc, domain) => {
                acc[domain] = Math.floor(Math.random() * 50) + 5;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
          createdAt: generateTimestamp(Math.floor(Math.random() * 150)),
        };

        const analysisRef = db.collection("linkAnalyses").doc(analysisId);
        batch.set(analysisRef, analysis);
        totalAnalyses++;

        if (totalAnalyses % 100 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalAnalyses} link analyses...`);
        }
      }
    }

    if (totalAnalyses % 100 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalAnalyses} link analyses`);
  }

  async seedActivities() {
    console.log("📈 Seeding user activity logs...");

    let batch = db.batch();
    let totalActivities = 0;

    for (const userId of this.userIds) {
      const activityCount = Math.floor(Math.random() * 50) + 20; // 20-70 activities per user

      for (let i = 0; i < activityCount; i++) {
        const activityId = `activity_${userId}_${Date.now()}_${i}`;
        const activityType = getRandomItem([
          "audit",
          "keyword-research",
          "content-analysis",
          "competitor-analysis",
          "login",
          "report-export",
          "team-invite",
        ] as const);

        const activity: ActivityDocument = {
          id: activityId,
          userId,
          type: activityType,
          description: this.generateActivityDescription(activityType),
          metadata: {
            ...(Math.random() > 0.5 && {
              projectId: getRandomItem(this.projectIds),
            }),
            ...(activityType !== "login" &&
              Math.random() > 0.4 && {
                analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              }),
            ...(activityType.includes("analysis") && {
              url: `https://${getRandomItem(SAMPLE_DOMAINS)}`,
            }),
            ...(activityType === "keyword-research" && {
              keyword: getRandomItem(SAMPLE_KEYWORDS),
            }),
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            sessionDuration: Math.floor(Math.random() * 3600) + 300,
          },
          ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: getRandomItem([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          ]),
          createdAt: generateTimestamp(Math.floor(Math.random() * 365)),
        };

        const activityRef = db.collection("activities").doc(activityId);
        batch.set(activityRef, activity);
        totalActivities++;

        if (totalActivities % 500 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalActivities} activities...`);
        }
      }
    }

    if (totalActivities % 500 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalActivities} user activities`);
  }

  private generateActivityDescription(
    type:
      | "audit"
      | "keyword-research"
      | "content-analysis"
      | "competitor-analysis"
      | "login"
      | "report-export"
      | "team-invite"
  ): string {
    const descriptions = {
      audit: "Performed comprehensive SEO audit",
      "keyword-research": "Conducted keyword research analysis",
      "content-analysis": "Analyzed content performance and optimization",
      "competitor-analysis": "Generated competitor intelligence report",
      login: "User logged into the platform",
      "report-export": "Exported analysis report to PDF",
      "team-invite": "Invited new team member to collaborate",
    };
    return descriptions[type] || "Platform activity performed";
  }

  async seedBilling() {
    console.log("💳 Seeding billing and payment data...");

    let batch = db.batch();
    let totalBilling = 0;

    // Only seed billing for paid tier users
    const paidUsers = this.userIds.filter(
      (userId) => !userId.includes("free") && !userId.includes("admin")
    );

    for (const userId of paidUsers) {
      const tier = userId.includes("starter")
        ? "starter"
        : userId.includes("agency")
          ? "agency"
          : "enterprise";

      const billingCount = Math.floor(Math.random() * 12) + 3; // 3-15 billing records per user

      for (let i = 0; i < billingCount; i++) {
        const billingId = `billing_${userId}_${Date.now()}_${i}`;
        const billingType = getRandomItem([
          "subscription",
          "one_time",
          "refund",
        ] as const);

        const tierPricing = {
          starter: { monthly: 29, annual: 290 },
          agency: { monthly: 99, annual: 990 },
          enterprise: { monthly: 299, annual: 2990 },
        };

        const isAnnual = Math.random() > 0.7;
        const baseAmount =
          tierPricing[tier as keyof typeof tierPricing][
            isAnnual ? "annual" : "monthly"
          ];
        const amount = billingType === "refund" ? -baseAmount : baseAmount;

        const billing: BillingDocument = {
          id: billingId,
          userId,
          type: billingType,
          amount: amount * 100, // Convert to cents
          currency: "USD",
          status: getRandomItem([
            "completed",
            "completed",
            "completed",
            "pending",
            "failed",
          ] as const), // Most completed
          paymentMethod: getRandomItem(["stripe", "paypal"] as const),
          subscriptionTier: tier,
          ...(billingType === "subscription" && {
            billingPeriod: {
              start: generateTimestamp(Math.floor(Math.random() * 365)),
              end: generateTimestamp(
                Math.floor(Math.random() * 365) - (isAnnual ? 365 : 30)
              ),
            },
          }),
          invoice: {
            number: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            downloadUrl: `https://invoices.rankpilot.com/${billingId}.pdf`,
            items: [
              {
                description: `RankPilot ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan - ${isAnnual ? "Annual" : "Monthly"}`,
                quantity: 1,
                unitPrice: amount * 100,
                total: amount * 100,
              },
            ],
          },
          paymentDetails: {
            stripePaymentId: `pi_${Math.random().toString(36).substr(2, 24)}`,
            last4: Math.floor(Math.random() * 9000 + 1000).toString(),
            brand: getRandomItem(["visa", "mastercard", "amex"]),
          },
          createdAt: generateTimestamp(Math.floor(Math.random() * 365)),
          processedAt: generateTimestamp(Math.floor(Math.random() * 364)),
        };

        const billingRef = db.collection("billing").doc(billingId);
        batch.set(billingRef, billing);
        totalBilling++;

        if (totalBilling % 200 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalBilling} billing records...`);
        }
      }
    }

    if (totalBilling % 200 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalBilling} billing records`);
  }

  async seedUsageTracking() {
    console.log("📊 Seeding usage tracking data...");

    let batch = db.batch();
    let totalUsage = 0;

    for (const userId of this.userIds) {
      const tier = userId.includes("free")
        ? "free"
        : userId.includes("starter")
          ? "starter"
          : userId.includes("agency")
            ? "agency"
            : userId.includes("enterprise")
              ? "enterprise"
              : "admin";

      // Generate 12 months of usage data
      for (let month = 0; month < 12; month++) {
        const usageId = `usage_${userId}_${2024}_${String(month + 1).padStart(2, "0")}`;
        const period = `2024-${String(month + 1).padStart(2, "0")}`;

        const tierLimits = {
          free: {
            analyses: 5,
            keywords: 100,
            content: 10,
            competitors: 0,
            api: 100,
            storage: 100,
            bandwidth: 1000,
          },
          starter: {
            analyses: 50,
            keywords: 1000,
            content: 100,
            competitors: 10,
            api: 1000,
            storage: 1000,
            bandwidth: 10000,
          },
          agency: {
            analyses: 200,
            keywords: 5000,
            content: 500,
            competitors: 50,
            api: 5000,
            storage: 5000,
            bandwidth: 50000,
          },
          enterprise: {
            analyses: -1,
            keywords: -1,
            content: -1,
            competitors: -1,
            api: 25000,
            storage: 25000,
            bandwidth: 250000,
          },
          admin: {
            analyses: -1,
            keywords: -1,
            content: -1,
            competitors: -1,
            api: -1,
            storage: -1,
            bandwidth: -1,
          },
        };

        const limits = tierLimits[tier as keyof typeof tierLimits];
        const usageMultiplier = Math.random() * 0.8 + 0.1; // 10-90% usage

        const usage: UsageDocument = {
          id: usageId,
          userId,
          period,
          usage: {
            neuroSeoAnalyses:
              limits.analyses === -1
                ? Math.floor(Math.random() * 1000)
                : Math.floor(limits.analyses * usageMultiplier),
            keywordSearches:
              limits.keywords === -1
                ? Math.floor(Math.random() * 10000)
                : Math.floor(limits.keywords * usageMultiplier),
            contentAnalyses:
              limits.content === -1
                ? Math.floor(Math.random() * 2000)
                : Math.floor(limits.content * usageMultiplier),
            competitorReports:
              limits.competitors === -1
                ? Math.floor(Math.random() * 200)
                : Math.floor(limits.competitors * usageMultiplier),
            apiCalls:
              limits.api === -1
                ? Math.floor(Math.random() * 50000)
                : Math.floor(limits.api * usageMultiplier),
            storageUsed:
              limits.storage === -1
                ? Math.floor(Math.random() * 100000)
                : Math.floor(limits.storage * usageMultiplier),
            bandwidthUsed:
              limits.bandwidth === -1
                ? Math.floor(Math.random() * 1000000)
                : Math.floor(limits.bandwidth * usageMultiplier),
          },
          limits: {
            neuroSeoAnalyses: limits.analyses,
            keywordSearches: limits.keywords,
            contentAnalyses: limits.content,
            competitorReports: limits.competitors,
            apiCalls: limits.api,
            storageUsed: limits.storage,
            bandwidthUsed: limits.bandwidth,
          },
          overage: {
            neuroSeoAnalyses:
              Math.random() > 0.9 ? Math.floor(Math.random() * 10) : 0,
            keywordSearches:
              Math.random() > 0.8 ? Math.floor(Math.random() * 100) : 0,
            contentAnalyses:
              Math.random() > 0.85 ? Math.floor(Math.random() * 20) : 0,
            competitorReports:
              Math.random() > 0.9 ? Math.floor(Math.random() * 5) : 0,
            apiCalls:
              Math.random() > 0.7 ? Math.floor(Math.random() * 1000) : 0,
          },
          createdAt: generateTimestamp(365 - month * 30),
          updatedAt: generateTimestamp(
            365 - month * 30 - Math.floor(Math.random() * 15)
          ),
        };

        const usageRef = db.collection("usage").doc(usageId);
        batch.set(usageRef, usage);
        totalUsage++;

        if (totalUsage % 500 === 0) {
          await batch.commit();
          batch = db.batch(); // NEW BATCH INSTANCE
          console.log(`  ✅ Seeded ${totalUsage} usage records...`);
        }
      }
    }

    if (totalUsage % 500 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(`✅ Successfully seeded ${totalUsage} usage tracking records`);
  }

  async seedSystemMetrics() {
    console.log("📈 Seeding system metrics data...");

    let batch = db.batch();
    let totalMetrics = 0;

    // Generate 365 days of system metrics
    for (let day = 0; day < 365; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateString = date.toISOString().split("T")[0];

      const metricsId = `metrics_${dateString}`;

      // Simulate realistic business growth
      const growthFactor = (365 - day) / 365; // Earlier dates have lower numbers
      const seasonality = 1 + 0.2 * Math.sin((day / 365) * 2 * Math.PI); // Seasonal variation

      const totalUsers = Math.floor(4000 * growthFactor * seasonality);
      const activeUsers = Math.floor(totalUsers * (0.3 + Math.random() * 0.4)); // 30-70% active
      const newSignups = Math.floor((50 + Math.random() * 100) * growthFactor);

      const metrics: SystemMetricsDocument = {
        id: metricsId,
        date: dateString,
        metrics: {
          totalUsers,
          activeUsers,
          newSignups,
          churnRate: Math.random() * 5 + 1, // 1-6%
          revenue: Math.floor(50000 * growthFactor * seasonality), // Daily revenue
          analysesPerformed: Math.floor(
            (500 + Math.random() * 1000) * growthFactor
          ),
          averageResponseTime: Math.random() * 1000 + 200, // 200-1200ms
          errorRate: Math.random() * 2 + 0.1, // 0.1-2.1%
          systemUptime: 99.5 + Math.random() * 0.5, // 99.5-100%
        },
        tierBreakdown: {
          free: {
            users: Math.floor(totalUsers * 0.7),
            usage: Math.floor(10000 * growthFactor),
          },
          starter: {
            users: Math.floor(totalUsers * 0.2),
            usage: Math.floor(5000 * growthFactor),
            revenue: Math.floor(15000 * growthFactor),
          },
          agency: {
            users: Math.floor(totalUsers * 0.08),
            usage: Math.floor(8000 * growthFactor),
            revenue: Math.floor(25000 * growthFactor),
          },
          enterprise: {
            users: Math.floor(totalUsers * 0.02),
            usage: Math.floor(12000 * growthFactor),
            revenue: Math.floor(10000 * growthFactor),
          },
        },
        featureUsage: {
          neuroSeoAnalyses: Math.floor(
            (200 + Math.random() * 300) * growthFactor
          ),
          keywordResearch: Math.floor(
            (150 + Math.random() * 250) * growthFactor
          ),
          contentAnalysis: Math.floor(
            (100 + Math.random() * 200) * growthFactor
          ),
          competitorAnalysis: Math.floor(
            (80 + Math.random() * 120) * growthFactor
          ),
          seoAudits: Math.floor((120 + Math.random() * 180) * growthFactor),
        },
        createdAt: generateTimestamp(day),
      };

      const metricsRef = db.collection("systemMetrics").doc(metricsId);
      batch.set(metricsRef, metrics);
      totalMetrics++;

      if (totalMetrics % 100 === 0) {
        await batch.commit();
        batch = db.batch(); // NEW BATCH INSTANCE
        console.log(`  ✅ Seeded ${totalMetrics}/365 system metrics...`);
      }
    }

    if (totalMetrics % 100 !== 0) {
      await batch.commit();
      batch = db.batch(); // NEW BATCH INSTANCE
    }

    console.log(
      `✅ Successfully seeded ${totalMetrics} system metrics records`
    );
  }
}

// CLI execution
if (require.main === module) {
  const seeder = new ComprehensiveDatabaseSeeder();
  seeder
    .seedAll()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
