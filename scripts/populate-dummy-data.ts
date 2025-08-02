// Script to populate comprehensive dummy data for all user types
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.test" });

// Initialize Firebase Admin
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "rankpilot-h3jpc";

  if (!privateKey || !clientEmail) {
    throw new Error("Missing Firebase Admin credentials in .env.test file");
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

const db = getFirestore();

interface UserProfile {
  id: string;
  email: string;
  tier: string;
  role: string;
  businessType: string;
  targetKeywords: string[];
  websites: string[];
  competitors: string[];
}

// User profiles for different tiers and use cases
const userProfiles: UserProfile[] = [
  {
    id: "test-free-user-1",
    email: "free.user1@test.com",
    tier: "free",
    role: "user",
    businessType: "personal-blog",
    targetKeywords: ["travel tips", "budget travel", "solo travel"],
    websites: ["https://myblog.com", "https://example.com/travel"],
    competitors: ["https://nomadlist.com", "https://travelandleisure.com"],
  },
  {
    id: "test-admin-free",
    email: "admin.free@test.com",
    tier: "free",
    role: "admin",
    businessType: "agency",
    targetKeywords: ["admin tools", "user management", "analytics"],
    websites: ["https://admin-portal.com"],
    competitors: ["https://analytics.google.com"],
  },
  {
    id: "test-starter-user-1",
    email: "starter.user1@test.com",
    tier: "starter",
    role: "user",
    businessType: "small-business",
    targetKeywords: ["local bakery", "fresh bread", "artisan pastries"],
    websites: ["https://sweetcorner-bakery.com", "https://localdelights.com"],
    competitors: ["https://panera.com", "https://starbucks.com"],
  },
  {
    id: "test-agency-user-1",
    email: "agency.user1@test.com",
    tier: "agency",
    role: "user",
    businessType: "marketing-agency",
    targetKeywords: [
      "digital marketing",
      "SEO services",
      "content strategy",
      "social media marketing",
    ],
    websites: [
      "https://digitalagency.com",
      "https://clientsite1.com",
      "https://clientsite2.com",
    ],
    competitors: [
      "https://hubspot.com",
      "https://moz.com",
      "https://semrush.com",
    ],
  },
  {
    id: "test-enterprise-user-1",
    email: "enterprise.user1@test.com",
    tier: "enterprise",
    role: "user",
    businessType: "enterprise",
    targetKeywords: [
      "enterprise software",
      "business solutions",
      "cloud computing",
      "AI technology",
    ],
    websites: [
      "https://techcorp.com",
      "https://products.techcorp.com",
      "https://blog.techcorp.com",
    ],
    competitors: [
      "https://microsoft.com",
      "https://google.com",
      "https://amazon.com",
    ],
  },
  {
    id: "test-admin-enterprise",
    email: "admin.enterprise@test.com",
    tier: "enterprise",
    role: "admin",
    businessType: "enterprise",
    targetKeywords: [
      "enterprise analytics",
      "data insights",
      "performance monitoring",
    ],
    websites: ["https://enterprise-dashboard.com"],
    competitors: ["https://tableau.com", "https://salesforce.com"],
  },
];

// Dummy NeuroSEO analysis data
function generateNeuroSEOAnalysis(profile: UserProfile, _index: number) {
  const now = new Date();
  const analysisDate = new Date(now.getTime() - index * 24 * 60 * 60 * 1000); // Spread over last few days

  return {
    id: `neuro-${profile.id}-${Date.now()}-${index}`,
    timestamp: analysisDate.toISOString(),
    userId: profile.id,
    urls: profile.websites.slice(
      0,
      profile.tier === "free" ? 1 : profile.tier === "starter" ? 2 : 3
    ),
    targetKeywords: profile.targetKeywords.slice(
      0,
      profile.tier === "free" ? 3 : profile.tier === "starter" ? 5 : 10
    ),
    competitorUrls: profile.competitors.slice(
      0,
      profile.tier === "free" ? 1 : 3
    ),
    analysisType:
      profile.tier === "free"
        ? "seo-focused"
        : profile.tier === "starter"
          ? "content-focused"
          : "comprehensive",
    overallScore:
      Math.floor(Math.random() * 30) +
      60 +
      (profile.tier === "enterprise" ? 10 : 0), // 60-100, higher for enterprise

    // Crawl Results
    crawlResults: profile.websites
      .slice(0, profile.tier === "free" ? 1 : 3)
      .map((url, urlIndex) => ({
        url,
        title: `${profile.businessType.replace("-", " ")} | Page ${urlIndex + 1}`,
        content: `Sample content for ${profile.businessType} focusing on ${profile.targetKeywords.join(", ")}. Lorem ipsum dolor sit amet...`,
        metadata: {
          description: `${profile.businessType} providing excellent ${profile.targetKeywords[0]} services`,
          keywords: profile.targetKeywords.join(", "),
          author: "Content Team",
          publishedTime: analysisDate.toISOString(),
          canonical: url,
        },
        technicalData: {
          loadTime: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
          pageSize: Math.floor(Math.random() * 500000) + 100000, // 100KB-600KB
          headings: {
            h1: [`${profile.businessType.replace("-", " ")} Services`],
            h2: profile.targetKeywords.slice(0, 3),
            h3: [`About Us`, `Contact`, `Services`],
          },
          images: [
            { src: `${url}/hero.jpg`, alt: "Hero image", title: "Main banner" },
            { src: `${url}/logo.png`, alt: "Company logo" },
          ],
          links: [
            { href: "/about", text: "About Us", isExternal: false },
            { href: "/contact", text: "Contact", isExternal: false },
            {
              href: profile.competitors[0],
              text: "Industry Leader",
              isExternal: true,
            },
          ],
          schema: [
            {
              "@type": "Organization",
              name: profile.businessType.replace("-", " "),
              url: url,
            },
          ],
        },
        authorshipSignals: {
          hasAuthorBio: profile.tier !== "free",
          hasContactInfo: true,
          hasAboutPage: true,
          socialLinks:
            profile.tier === "free"
              ? []
              : [
                  "https://linkedin.com/company/example",
                  "https://twitter.com/example",
                ],
          expertiseSignals:
            profile.tier === "free"
              ? []
              : ["Industry Experience", "Certified Professional"],
        },
        semanticClassification: {
          contentType:
            profile.businessType === "personal-blog" ? "article" : "service",
          topicCategories: [
            profile.businessType.includes("tech") ? "Technology" : "Business",
          ],
          keyEntities: profile.targetKeywords.slice(0, 5),
          readingLevel: Math.floor(Math.random() * 5) + 8, // Grade 8-12
          contentDepth:
            profile.tier === "free"
              ? "surface"
              : profile.tier === "starter"
                ? "moderate"
                : "comprehensive",
        },
      })),

    // Visibility Analysis
    visibilityAnalysis: [
      {
        url: profile.websites[0],
        queries: profile.targetKeywords.slice(0, 3).map((keyword, qIndex) => ({
          id: `query-${qIndex}`,
          query: `What is the best ${keyword}?`,
          intent: "informational" as const,
          targetKeywords: [keyword],
          expectedAnswerType: "definition" as const,
        })),
        results: profile.targetKeywords.slice(0, 3).map((keyword, qIndex) => ({
          queryId: `query-${qIndex}`,
          _response: `Based on analysis, ${keyword} involves...`,
          sources: [
            {
              url: profile.websites[0],
              title: `${keyword} Guide`,
              snippet: `Comprehensive information about ${keyword}`,
              relevanceScore: Math.random() * 0.4 + 0.6, // 0.6-1.0
              citationPosition: Math.floor(Math.random() * 3) + 1, // 1-3
            },
          ],
          confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
          responseTime: Math.floor(Math.random() * 1000) + 500, // 500-1500ms
        })),
        citationAnalysis: {
          isCited: Math.random() > 0.3, // 70% chance of being cited
          citationPosition: Math.floor(Math.random() * 5) + 1,
          citationContext: `Reference to ${profile.targetKeywords[0]} expertise`,
          citationType: "referenced" as const,
          relevanceScore: Math.random() * 0.4 + 0.6,
          competitorCitations: profile.competitors
            .slice(0, 2)
            .map((comp, compIndex) => ({
              url: comp,
              position: compIndex + 2,
              context: `Competitor reference ${compIndex + 1}`,
            })),
        },
        overallVisibilityScore:
          Math.floor(Math.random() * 30) +
          50 +
          (profile.tier === "enterprise" ? 15 : 0),
      },
    ],

    // Trust Analysis
    trustAnalysis: [
      {
        url: profile.websites[0],
        eatScore: {
          expertise:
            Math.floor(Math.random() * 30) +
            60 +
            (profile.tier === "enterprise" ? 10 : 0),
          authoritativeness:
            Math.floor(Math.random() * 30) +
            55 +
            (profile.tier === "enterprise" ? 15 : 0),
          trustworthiness:
            Math.floor(Math.random() * 25) +
            65 +
            (profile.tier === "enterprise" ? 10 : 0),
        },
        credibilitySignals: {
          hasAuthorCredentials: profile.tier !== "free",
          hasCitations:
            profile.tier === "agency" || profile.tier === "enterprise",
          hasContactInfo: true,
          hasPrivacyPolicy: profile.tier !== "free",
          hasTermsOfService: profile.tier !== "free",
          sslEnabled: true,
          domainAge: Math.floor(Math.random() * 1000) + 365, // 1-3 years
          backlinks:
            Math.floor(Math.random() * 1000) +
            (profile.tier === "enterprise" ? 500 : 100),
        },
        complianceStatus: {
          gdprCompliant: profile.tier !== "free",
          accessibilityScore:
            Math.floor(Math.random() * 20) +
            75 +
            (profile.tier === "enterprise" ? 5 : 0),
          contentPolicyCompliance: true,
        },
        overallTrustScore:
          Math.floor(Math.random() * 25) +
          65 +
          (profile.tier === "enterprise" ? 10 : 0),
      },
    ],

    // Key Insights
    keyInsights: [
      {
        category: "seo" as const,
        title: "SEO Optimization Opportunities",
        description: `Your ${profile.businessType} site shows potential for keyword optimization`,
        impact:
          profile.tier === "free" ? ("medium" as const) : ("high" as const),
        confidence: 0.85,
        evidence: [
          "Missing meta descriptions",
          "Keyword density below optimal",
        ],
        recommendation: `Focus on optimizing for ${profile.targetKeywords[0]} and related terms`,
      },
      {
        category: "content" as const,
        title: "Content Enhancement Needed",
        description: "Content depth and semantic richness could be improved",
        impact: "high" as const,
        confidence: 0.78,
        evidence: ["Limited topic coverage", "Low semantic density"],
        recommendation:
          "Expand content to cover related subtopics comprehensively",
      },
    ],

    // Actionable Tasks
    actionableTasks: [
      {
        id: `task-1-${profile.id}`,
        title: `Optimize ${profile.targetKeywords[0]} content`,
        description: `Enhance content targeting ${profile.targetKeywords[0]} keyword`,
        category: "content" as const,
        priority: "high" as const,
        estimatedEffort: "medium" as const,
        estimatedImpact: 85,
        timeframe: "1-2 weeks",
        dependencies: [],
        resources: [
          {
            type: "guide" as const,
            title: "Content Optimization Guide",
            description: "Step-by-step content improvement process",
          },
        ],
      },
      {
        id: `task-2-${profile.id}`,
        title: "Technical SEO Audit",
        description: "Review and fix technical SEO issues",
        category: "technical" as const,
        priority: "medium" as const,
        estimatedEffort: "low" as const,
        estimatedImpact: 65,
        timeframe: "3-5 days",
        dependencies: [],
        resources: [
          {
            type: "tool" as const,
            title: "SEO Audit Checklist",
            description: "Comprehensive technical SEO checklist",
          },
        ],
      },
    ],

    createdAt: Timestamp.fromDate(analysisDate),
    updatedAt: Timestamp.fromDate(analysisDate),
  };
}

// Generate activity data
function generateUserActivities(profile: UserProfile) {
  const activities = [];
  const now = new Date();

  // Generate 10-20 activities per user over the last 30 days
  const activityCount = Math.floor(Math.random() * 10) + 10;

  for (let i = 0; i < activityCount; i++) {
    const activityDate = new Date(
      now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000
    );

    const activityTypes = [
      "analysis_started",
      "analysis_completed",
      "report_viewed",
      "task_completed",
      "dashboard_visited",
      "settings_updated",
    ];

    const activityType =
      activityTypes[Math.floor(Math.random() * activityTypes.length)];

    activities.push({
      id: `activity-${profile.id}-${i}`,
      type: activityType,
      description: `User ${activityType.replace("_", " ")} for ${profile.businessType}`,
      metadata: {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ip: "192.168.1.100",
        feature: activityType.includes("analysis") ? "neuroseo" : "dashboard",
      },
      timestamp: Timestamp.fromDate(activityDate),
      createdAt: Timestamp.fromDate(activityDate),
    });
  }

  return activities;
}

// Generate usage tracking data
function generateUsageData(profile: UserProfile) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Usage limits based on tier
  const tierLimits = {
    free: { reports: 3, audits: 5, crawls: 10 },
    starter: { reports: 10, audits: 25, crawls: 50 },
    agency: { reports: 50, audits: 100, crawls: 250 },
    enterprise: { reports: 200, audits: 500, crawls: 1000 },
  };

  const limits = tierLimits[profile.tier as keyof typeof tierLimits];

  return {
    id: `usage-${profile.id}-${currentMonth}`,
    period: currentMonth,
    usage: {
      reports: Math.floor(Math.random() * (limits.reports * 0.8)), // Use 0-80% of limit
      audits: Math.floor(Math.random() * (limits.audits * 0.8)),
      crawls: Math.floor(Math.random() * (limits.crawls * 0.8)),
    },
    limits,
    resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), // Next month
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
}

// Generate payment history for paid tiers
function generatePaymentHistory(profile: UserProfile) {
  if (profile.tier === "free") return [];

  const payments = [];
  const now = new Date();

  // Generate 3-6 months of payment history
  const monthsBack = Math.floor(Math.random() * 3) + 3;

  const tierPricing = {
    starter: 29,
    agency: 99,
    enterprise: 299,
  };

  const price = tierPricing[profile.tier as keyof typeof tierPricing];

  for (let i = 0; i < monthsBack; i++) {
    const paymentDate = new Date(now.getFullYear(), now.getMonth() - i, 1);

    payments.push({
      id: `payment-${profile.id}-${i}`,
      amount: price,
      currency: "USD",
      status: "succeeded",
      stripePaymentId: `pi_${Math.random().toString(36).substr(2, 24)}`,
      description: `${profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)} Plan - Monthly`,
      createdAt: Timestamp.fromDate(paymentDate),
      paidAt: Timestamp.fromDate(paymentDate),
    });
  }

  return payments;
}

export async function populateDummyData() {
  console.log("🚀 Starting dummy data population...");

  try {
    for (const profile of userProfiles) {
      console.log(
        `\n📊 Populating data for ${profile.email} (${profile.tier})...`
      );

      // 1. Generate NeuroSEO analysis data (2-5 analyses based on tier)
      const analysisCount =
        profile.tier === "free" ? 2 : profile.tier === "starter" ? 3 : 5;
      console.log(`  📈 Creating ${analysisCount} NeuroSEO analyses...`);

      for (let i = 0; i < analysisCount; i++) {
        const analysisData = generateNeuroSEOAnalysis(profile, i);
        await db
          .collection("neuroseo-analyses")
          .doc(analysisData.id)
          .set(analysisData);
      }

      // 2. Generate user activities
      console.log(`  🔄 Creating user activities...`);
      const activities = generateUserActivities(profile);

      for (const activity of activities) {
        await db
          .collection("users")
          .doc(profile.id)
          .collection("activities")
          .doc(activity.id)
          .set(activity);
      }

      // 3. Generate usage tracking data
      console.log(`  📊 Creating usage data...`);
      const usageData = generateUsageData(profile);
      await db
        .collection("users")
        .doc(profile.id)
        .collection("usage")
        .doc(usageData.id)
        .set(usageData);

      // 4. Generate payment history for paid users
      if (profile.tier !== "free") {
        console.log(`  💳 Creating payment history...`);
        const payments = generatePaymentHistory(profile);

        for (const payment of payments) {
          await db
            .collection("users")
            .doc(profile.id)
            .collection("payments")
            .doc(payment.id)
            .set(payment);
        }
      }

      // 5. Update user profile with additional metadata
      console.log(`  👤 Updating user profile...`);
      await db
        .collection("users")
        .doc(profile.id)
        .update({
          businessType: profile.businessType,
          targetKeywords: profile.targetKeywords,
          websites: profile.websites,
          competitors: profile.competitors,
          lastAnalysisAt: Timestamp.fromDate(new Date()),
          totalAnalyses: analysisCount,
          updatedAt: Timestamp.fromDate(new Date()),
        });

      console.log(`  ✅ Completed data population for ${profile.email}`);
    }

    console.log("\n🎉 Dummy data population completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   👥 Users: ${userProfiles.length}`);
    console.log(
      `   📈 NeuroSEO Analyses: ${userProfiles.reduce((sum, p) => sum + (p.tier === "free" ? 2 : p.tier === "starter" ? 3 : 5), 0)}`
    );
    console.log(`   🔄 Activities: ${userProfiles.length * 15} (avg)`);
    console.log(
      `   💳 Payment Records: ${userProfiles.filter((p) => p.tier !== "free").length * 4} (avg)`
    );
  } catch (_error) {
    console.error("❌ Error populating dummy _data:", _error);
    throw error;
  }
}

if (require.main === module) {
  populateDummyData()
    .then(() => {
      console.log("\n🔍 Run the following to verify _data:");
      console.log("   npm run ts-node scripts/get-all-users.ts");
      console.log("   npm run ts-node scripts/verify-dummy-data.ts");
      process.exit(0);
    })
    .catch((_error) => {
      console.error("💥 Failed to populate dummy _data:", _error);
      process.exit(1);
    });
}
