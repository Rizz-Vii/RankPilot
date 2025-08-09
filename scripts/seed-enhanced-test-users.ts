/**
 * Enhanced Test User Seeder with Realistic Data Integration
 * 
 * Creates test users with comprehensive data profiles matching the new database structure.
 * Ensures continuity for existing test users while adding realistic business data.
 * 
 * Generated: July 26, 2025
 * Integration: Existing test users + new comprehensive database schema
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
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
const auth = getAuth();

// Existing test users from test.config.ts - maintaining continuity
export const EXISTING_TEST_USERS = {
  free: {
    email: "abbas_ali_rizvi@hotmail.com",
    password: "123456",
    tier: "free" as const,
    displayName: "Abbas Ali (Free)",
    uid: "test_free_abbas_ali"
  },
  starter: {
    email: "starter@rankpilot.com",
    password: "starter123",
    tier: "starter" as const,
    displayName: "Starter User",
    uid: "test_starter_user"
  },
  agency: {
    email: "agency@rankpilot.com", // Fixed: was using enterprise email
    password: "agency123",
    tier: "agency" as const,
    displayName: "Agency User",
    uid: "test_agency_user"
  },
  enterprise: {
    email: "enterprise@rankpilot.com",
    password: "enterprise123",
    tier: "enterprise" as const,
    displayName: "Enterprise User",
    uid: "test_enterprise_user"
  },
  admin: {
    email: "admin@rankpilot.com",
    password: "admin123",
    tier: "admin" as const,
    displayName: "Admin User",
    uid: "test_admin_user"
  }
};

// Enhanced test user data with realistic business scenarios
interface EnhancedTestUserProfile {
  // Basic user data
  uid: string;
  email: string;
  displayName: string;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: 'active' | 'trialing' | 'past_due';

  // Profile with realistic business context
  profile: {
    company: string;
    website: string;
    industry: string;
    teamSize: string;
    goals: string[];
    avatar?: string;
    timezone: string;
    language: string;
  };

  // Usage and limits matching tier
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

  // Test-specific data for feature testing
  testData: {
    projects: Array<{
      name: string;
      domain: string;
      targetKeywords: string[];
      competitors: string[];
    }>;
    sampleAnalyses: Array<{
      type: string;
      url: string;
      keywords: string[];
      completed: boolean;
    }>;
    teamMembers?: Array<{
      email: string;
      role: string;
    }>;
  };

  // Timestamps
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  updatedAt: Timestamp;
}

// Enhanced test user profiles with realistic data for comprehensive testing
const ENHANCED_TEST_PROFILES: Record<string, EnhancedTestUserProfile> = {
  free: {
    uid: "test_free_abbas_ali",
    email: "abbas_ali_rizvi@hotmail.com",
    displayName: "Abbas Ali (Free)",
    role: "free",
    subscriptionTier: "free",
    subscriptionStatus: "active",
    profile: {
      company: "Personal Blog",
      website: "https://abbas-ali-blog.demo.com",
      industry: "Technology",
      teamSize: "1",
      goals: ["Increase organic traffic", "Learn SEO basics"],
      timezone: "UTC",
      language: "en"
    },
    usage: {
      neuroSeoAnalyses: 4,      // Close to free limit
      keywordSearches: 85,      // Heavy usage for free tier
      contentAnalyses: 8,       // Near limit
      competitorReports: 0,     // Not available
      teamMembers: 1,           // Solo user
      apiCalls: 45
    },
    limits: {
      neuroSeoAnalyses: 5,
      keywordSearches: 100,
      contentAnalyses: 10,
      competitorReports: 0,
      teamMembers: 1,
      apiCalls: 100
    },
    testData: {
      projects: [
        {
          name: "Personal Tech Blog",
          domain: "abbas-ali-blog.demo.com",
          targetKeywords: ["tech tutorials", "programming tips", "web development"],
          competitors: ["techcrunch.com", "dev.to"]
        }
      ],
      sampleAnalyses: [
        {
          type: "neuroseo_basic",
          url: "https://abbas-ali-blog.demo.com",
          keywords: ["tech tutorials"],
          completed: true
        },
        {
          type: "keyword_research",
          url: "https://abbas-ali-blog.demo.com",
          keywords: ["programming tips", "web development"],
          completed: true
        }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
    updatedAt: Timestamp.fromDate(new Date())
  },

  starter: {
    uid: "test_starter_user",
    email: "starter@rankpilot.com",
    displayName: "Starter User",
    role: "starter",
    subscriptionTier: "starter",
    subscriptionStatus: "active",
    profile: {
      company: "Digital Marketing Agency",
      website: "https://digital-growth-agency.demo.com",
      industry: "Marketing",
      teamSize: "1-10",
      goals: ["Improve client SEO", "Generate more leads", "Content optimization"],
      timezone: "UTC",
      language: "en"
    },
    usage: {
      neuroSeoAnalyses: 35,     // Good usage
      keywordSearches: 650,     // High usage
      contentAnalyses: 78,      // Regular usage
      competitorReports: 8,     // Testing competitor features
      teamMembers: 1,
      apiCalls: 580
    },
    limits: {
      neuroSeoAnalyses: 50,
      keywordSearches: 1000,
      contentAnalyses: 100,
      competitorReports: 10,
      teamMembers: 1,
      apiCalls: 1000
    },
    testData: {
      projects: [
        {
          name: "Client Website - E-commerce",
          domain: "client-ecommerce.demo.com",
          targetKeywords: ["online shopping", "best deals", "product reviews"],
          competitors: ["amazon.com", "ebay.com", "etsy.com"]
        },
        {
          name: "Client Website - Local Service",
          domain: "local-plumber.demo.com",
          targetKeywords: ["plumber near me", "emergency plumbing", "drain cleaning"],
          competitors: ["angieslist.com", "homeadvisor.com"]
        }
      ],
      sampleAnalyses: [
        {
          type: "neuroseo_comprehensive",
          url: "https://client-ecommerce.demo.com",
          keywords: ["online shopping", "best deals"],
          completed: true
        },
        {
          type: "content_analysis",
          url: "https://client-ecommerce.demo.com/products",
          keywords: ["product reviews"],
          completed: true
        },
        {
          type: "seo_audit",
          url: "https://local-plumber.demo.com",
          keywords: ["plumber near me"],
          completed: true
        }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)), // 60 days ago
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
    updatedAt: Timestamp.fromDate(new Date())
  },

  agency: {
    uid: "test_agency_user",
    email: "agency@rankpilot.com",
    displayName: "Agency User",
    role: "agency",
    subscriptionTier: "agency",
    subscriptionStatus: "active",
    profile: {
      company: "SEO Masters Agency",
      website: "https://seo-masters-agency.demo.com",
      industry: "Marketing",
      teamSize: "11-50",
      goals: ["Scale client services", "Team collaboration", "White-label reports"],
      timezone: "UTC",
      language: "en"
    },
    usage: {
      neuroSeoAnalyses: 145,    // Heavy usage
      keywordSearches: 3200,   // High volume
      contentAnalyses: 380,    // Frequent usage
      competitorReports: 42,   // Regular competitor analysis
      teamMembers: 8,          // Team environment
      apiCalls: 4200
    },
    limits: {
      neuroSeoAnalyses: 200,
      keywordSearches: 5000,
      contentAnalyses: 500,
      competitorReports: 50,
      teamMembers: 10,
      apiCalls: 5000
    },
    testData: {
      projects: [
        {
          name: "Fortune 500 Client",
          domain: "fortune500-client.demo.com",
          targetKeywords: ["enterprise software", "business solutions", "technology consulting"],
          competitors: ["salesforce.com", "microsoft.com", "oracle.com"]
        },
        {
          name: "SaaS Startup Client",
          domain: "saas-startup.demo.com",
          targetKeywords: ["project management", "team collaboration", "productivity tools"],
          competitors: ["asana.com", "monday.com", "trello.com"]
        },
        {
          name: "E-learning Platform",
          domain: "online-learning.demo.com",
          targetKeywords: ["online courses", "professional development", "skill training"],
          competitors: ["coursera.org", "udemy.com", "linkedin.com"]
        }
      ],
      sampleAnalyses: [
        {
          type: "neuroseo_comprehensive",
          url: "https://fortune500-client.demo.com",
          keywords: ["enterprise software", "business solutions"],
          completed: true
        },
        {
          type: "competitor_analysis",
          url: "https://saas-startup.demo.com",
          keywords: ["project management", "team collaboration"],
          completed: true
        },
        {
          type: "link_analysis",
          url: "https://online-learning.demo.com",
          keywords: ["online courses"],
          completed: true
        }
      ],
      teamMembers: [
        { email: "seo-manager@seo-masters-agency.demo.com", role: "admin" },
        { email: "content-specialist@seo-masters-agency.demo.com", role: "editor" },
        { email: "analyst@seo-masters-agency.demo.com", role: "viewer" }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)), // 120 days ago
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000)), // 30 minutes ago
    updatedAt: Timestamp.fromDate(new Date())
  },

  enterprise: {
    uid: "test_enterprise_user",
    email: "enterprise@rankpilot.com",
    displayName: "Enterprise User",
    role: "enterprise",
    subscriptionTier: "enterprise",
    subscriptionStatus: "active",
    profile: {
      company: "Global Tech Corporation",
      website: "https://global-tech-corp.demo.com",
      industry: "Technology",
      teamSize: "500+",
      goals: ["Enterprise SEO strategy", "Multi-brand management", "API integration"],
      timezone: "UTC",
      language: "en"
    },
    usage: {
      neuroSeoAnalyses: 580,    // Enterprise volume
      keywordSearches: 12500,  // High volume enterprise usage
      contentAnalyses: 1200,   // Content at scale
      competitorReports: 150,  // Comprehensive competitive intelligence
      teamMembers: 25,         // Large team
      apiCalls: 18500
    },
    limits: {
      neuroSeoAnalyses: -1,    // Unlimited
      keywordSearches: -1,     // Unlimited
      contentAnalyses: -1,     // Unlimited
      competitorReports: -1,   // Unlimited
      teamMembers: 50,         // Large team limit
      apiCalls: 25000
    },
    testData: {
      projects: [
        {
          name: "Global Corporate Site",
          domain: "global-tech-corp.demo.com",
          targetKeywords: ["enterprise technology", "digital transformation", "cloud solutions"],
          competitors: ["ibm.com", "accenture.com", "deloitte.com"]
        },
        {
          name: "Product Line - AI Solutions",
          domain: "ai-products.global-tech-corp.demo.com",
          targetKeywords: ["artificial intelligence", "machine learning", "AI consulting"],
          competitors: ["openai.com", "anthropic.com", "google.com"]
        },
        {
          name: "Regional Site - APAC",
          domain: "apac.global-tech-corp.demo.com",
          targetKeywords: ["technology solutions asia", "digital innovation", "enterprise services"],
          competitors: ["tcs.com", "infosys.com", "wipro.com"]
        },
        {
          name: "Investor Relations",
          domain: "investors.global-tech-corp.demo.com",
          targetKeywords: ["investor relations", "financial reports", "shareholder information"],
          competitors: ["sec.gov", "nasdaq.com"]
        }
      ],
      sampleAnalyses: [
        {
          type: "neuroseo_comprehensive",
          url: "https://global-tech-corp.demo.com",
          keywords: ["enterprise technology", "digital transformation"],
          completed: true
        },
        {
          type: "competitor_analysis",
          url: "https://ai-products.global-tech-corp.demo.com",
          keywords: ["artificial intelligence", "machine learning"],
          completed: true
        },
        {
          type: "link_analysis",
          url: "https://apac.global-tech-corp.demo.com",
          keywords: ["technology solutions asia"],
          completed: true
        }
      ],
      teamMembers: [
        { email: "seo-director@global-tech-corp.demo.com", role: "admin" },
        { email: "content-manager@global-tech-corp.demo.com", role: "admin" },
        { email: "regional-manager-apac@global-tech-corp.demo.com", role: "editor" },
        { email: "analyst-team-lead@global-tech-corp.demo.com", role: "editor" },
        { email: "junior-analyst@global-tech-corp.demo.com", role: "viewer" }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)), // 180 days ago
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000)), // 10 minutes ago
    updatedAt: Timestamp.fromDate(new Date())
  },

  admin: {
    uid: "test_admin_user",
    email: "admin@rankpilot.com",
    displayName: "Admin User",
    role: "admin",
    subscriptionTier: "admin",
    subscriptionStatus: "active",
    profile: {
      company: "RankPilot Platform",
      website: "https://rankpilot.com",
      industry: "SaaS",
      teamSize: "11-50",
      goals: ["Platform monitoring", "User management", "System optimization"],
      timezone: "UTC",
      language: "en"
    },
    usage: {
      neuroSeoAnalyses: 25,     // Testing and validation
      keywordSearches: 200,    // Platform testing
      contentAnalyses: 50,     // Quality assurance
      competitorReports: 15,   // Market research
      teamMembers: 1,          // Solo admin
      apiCalls: 500
    },
    limits: {
      neuroSeoAnalyses: -1,    // Unlimited admin access
      keywordSearches: -1,     // Unlimited
      contentAnalyses: -1,     // Unlimited
      competitorReports: -1,   // Unlimited
      teamMembers: -1,         // Unlimited
      apiCalls: -1             // Unlimited
    },
    testData: {
      projects: [
        {
          name: "RankPilot Platform",
          domain: "rankpilot.com",
          targetKeywords: ["seo platform", "ai seo tools", "enterprise seo"],
          competitors: ["semrush.com", "ahrefs.com", "moz.com"]
        }
      ],
      sampleAnalyses: [
        {
          type: "neuroseo_comprehensive",
          url: "https://rankpilot.com",
          keywords: ["seo platform", "ai seo tools"],
          completed: true
        },
        {
          type: "competitor_analysis",
          url: "https://rankpilot.com",
          keywords: ["enterprise seo"],
          completed: true
        }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)), // 1 year ago
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)), // 5 minutes ago
    updatedAt: Timestamp.fromDate(new Date())
  }
};

export class EnhancedTestUserSeeder {
  async seedAllTestUsers() {
    console.log("🧪 Seeding enhanced test users with comprehensive data...");

    for (const [tier, userData] of Object.entries(ENHANCED_TEST_PROFILES)) {
      await this.seedTestUser(tier, userData);
    }

    console.log("✅ All enhanced test users seeded successfully!");
  }

  private async seedTestUser(tier: string, userData: EnhancedTestUserProfile) {
    console.log(`  🔄 Seeding ${tier} user: ${userData.email}`);

    try {
      // Create or update Firebase Auth user
      let firebaseUser;
      try {
        firebaseUser = await auth.getUserByEmail(userData.email);
        console.log(`    ✅ Auth user exists: ${firebaseUser.uid}`);
      } catch (error) {
        // User doesn't exist, create new one
        firebaseUser = await auth.createUser({
          uid: userData.uid,
          email: userData.email,
          password: EXISTING_TEST_USERS[tier as keyof typeof EXISTING_TEST_USERS].password,
          displayName: userData.displayName,
        });
        console.log(`    ✅ Created auth user: ${firebaseUser.uid}`);
      }

      // Create/update user document in Firestore
      await db.collection('users').doc(userData.uid).set({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        subscriptionTier: userData.subscriptionTier,
        subscriptionStatus: userData.subscriptionStatus,
        profile: userData.profile,
        preferences: {
          emailNotifications: true,
          weeklyReports: true,
          competitorAlerts: true,
          seoRecommendations: true,
          darkMode: false,
          dashboardLayout: 'standard'
        },
        usage: userData.usage,
        limits: userData.limits,
        lastLoginAt: userData.lastLoginAt,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        testAccount: true // Mark as test account
      });

      // Create test projects
      for (const [index, project] of userData.testData.projects.entries()) {
        const projectId = `${userData.uid}_project_${index + 1}`;
        await db.collection('projects').doc(projectId).set({
          id: projectId,
          userId: userData.uid,
          name: project.name,
          domain: project.domain,
          url: `https://${project.domain}`,
          description: `Test project for ${tier} tier user`,
          industry: userData.profile.industry,
          targetMarkets: ['US', 'UK'],
          targetKeywords: project.targetKeywords,
          competitors: project.competitors,
          status: 'active',
          settings: {
            crawlDepth: 2,
            analysisFrequency: 'weekly',
            alertThresholds: {
              rankingDrop: 5,
              trafficDrop: 15,
              errorIncrease: 5
            }
          },
          lastAnalyzedAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          testData: true // Mark as test data
        });
      }

      // Create sample NeuroSEO analyses
      for (const [index, analysis] of userData.testData.sampleAnalyses.entries()) {
        const analysisId = `${userData.uid}_analysis_${index + 1}`;
        await db.collection('neuroSeoAnalyses').doc(analysisId).set({
          id: analysisId,
          userId: userData.uid,
          projectId: `${userData.uid}_project_1`, // Link to first project
          analysisType: 'comprehensive',
          urls: [analysis.url],
          targetKeywords: analysis.keywords,
          engines: {
            neuralCrawler: {
              status: 'completed',
              results: {
                pages: [{
                  url: analysis.url,
                  title: `Test Page - ${analysis.keywords[0]}`,
                  metaDescription: `Test meta description for ${analysis.keywords[0]}`,
                  content: `Sample content for testing ${analysis.keywords.join(', ')}`,
                  headings: { h1: ['Main Heading'], h2: ['Sub Heading 1', 'Sub Heading 2'] },
                  images: [{ src: '/test-image.jpg', alt: 'Test image' }],
                  links: [{ href: '/', text: 'Home', type: 'internal' }],
                  technicalIssues: []
                }],
                siteStructure: {
                  totalPages: 25,
                  uniquePages: 25,
                  duplicateContent: 0,
                  orphanPages: 0
                }
              },
              executionTime: 45
            },
            semanticMap: {
              status: 'completed',
              results: {
                topicClusters: [{
                  topic: analysis.keywords[0],
                  keywords: analysis.keywords,
                  contentGaps: ['Related topic 1', 'Related topic 2'],
                  relatedTopics: ['Topic A', 'Topic B'],
                  semanticScore: 78
                }],
                keywordDensity: Object.fromEntries(analysis.keywords.map(k => [k, Math.random() * 3])),
                readabilityScore: 72,
                contentDepth: 8
              },
              executionTime: 30
            },
            aiVisibilityEngine: {
              status: 'completed',
              results: {
                aiCitations: [{
                  aiPlatform: 'ChatGPT',
                  citationCount: 5,
                  citationContext: ['Technical documentation', 'Best practices'],
                  citationQuality: 'high'
                }],
                visibilityScore: 85,
                optimizationSuggestions: ['Improve E-A-T signals', 'Add more structured data'],
                competitorComparison: []
              },
              executionTime: 60
            },
            trustBlock: {
              status: 'completed',
              results: {
                eatScore: {
                  expertise: 82,
                  authoritativeness: 75,
                  trustworthiness: 88,
                  overall: 82
                },
                trustSignals: [{
                  signal: 'Author bio present',
                  status: 'present',
                  impact: 'medium',
                  recommendations: ['Add credentials']
                }],
                authorCredibility: {
                  authorBio: true,
                  credentials: false,
                  linkedinProfile: true,
                  authorPhoto: true
                }
              },
              executionTime: 25
            },
            rewriteGen: {
              status: 'completed',
              results: {
                contentSuggestions: [{
                  section: 'Introduction',
                  originalText: 'Original intro text',
                  suggestedText: 'Improved intro text with better SEO',
                  improvementType: 'seo',
                  confidence: 0.89
                }],
                titleSuggestions: [`Optimized ${analysis.keywords[0]} Guide`],
                metaDescriptionSuggestions: [`Learn about ${analysis.keywords[0]} with our comprehensive guide`],
                overallImprovementScore: 76
              },
              executionTime: 40
            },
            orchestrator: {
              status: 'completed',
              results: {
                overallScore: 78,
                priorityActions: [{
                  action: 'Optimize title tags',
                  impact: 'high',
                  effort: 'low',
                  timeline: '1 week'
                }],
                competitiveAnalysis: {
                  strengthsVsCompetitors: ['Better content depth'],
                  weaknessesVsCompetitors: ['Lower domain authority'],
                  opportunities: ['Content gap in Topic X'],
                  threats: ['New competitor entering space']
                }
              },
              executionTime: 15
            }
          },
          summary: {
            overallScore: 78,
            keyFindings: ['Strong content quality', 'Good technical SEO', 'Opportunity for link building'],
            quickWins: ['Optimize title tags', 'Add missing alt text'],
            longTermStrategy: ['Build domain authority', 'Expand content clusters'],
            estimatedImpact: '15-25% traffic increase in 3 months'
          },
          status: 'completed',
          createdAt: Timestamp.fromDate(new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000)),
          completedAt: Timestamp.fromDate(new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000)),
          executionTime: 215,
          testData: true // Mark as test data
        });
      }

      // Create team for agency and enterprise users
      if (tier === 'agency' || tier === 'enterprise') {
        const teamId = `${userData.uid}_team`;
        await db.collection('teams').doc(teamId).set({
          id: teamId,
          ownerId: userData.uid,
          name: `${userData.profile.company} Team`,
          description: `Test team for ${tier} tier testing`,
          plan: tier,
          memberIds: (userData.testData.teamMembers || []).map(member => `${userData.uid}_member_${member.email.split('@')[0]}`),
          members: userData.testData.teamMembers?.map(member => ({
            userId: `${userData.uid}_member_${member.email.split('@')[0]}`,
            email: member.email,
            role: member.role,
            joinedAt: userData.createdAt,
            permissions: ['read_projects', 'create_analyses', 'export_reports']
          })) || [],
          projects: userData.testData.projects.map((_, index) => `${userData.uid}_project_${index + 1}`),
          settings: {
            allowInvites: true,
            requireApproval: false,
            brandingEnabled: tier === 'enterprise',
            reportSharing: true
          },
          usage: {
            totalAnalyses: userData.testData.sampleAnalyses.length,
            totalReports: Math.floor(userData.testData.sampleAnalyses.length / 2),
            storageUsed: Math.floor(Math.random() * 5000) + 1000
          },
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          testData: true // Mark as test data
        });
      }

      // Create usage tracking records
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      await db.collection('usage').doc(`${userData.uid}_${currentMonth}`).set({
        id: `${userData.uid}_${currentMonth}`,
        userId: userData.uid,
        period: currentMonth,
        usage: userData.usage,
        limits: userData.limits,
        overage: {
          neuroSeoAnalyses: Math.max(0, userData.usage.neuroSeoAnalyses - (userData.limits.neuroSeoAnalyses === -1 ? 999999 : userData.limits.neuroSeoAnalyses)),
          keywordSearches: Math.max(0, userData.usage.keywordSearches - (userData.limits.keywordSearches === -1 ? 999999 : userData.limits.keywordSearches)),
          contentAnalyses: Math.max(0, userData.usage.contentAnalyses - (userData.limits.contentAnalyses === -1 ? 999999 : userData.limits.contentAnalyses)),
          competitorReports: Math.max(0, userData.usage.competitorReports - (userData.limits.competitorReports === -1 ? 999999 : userData.limits.competitorReports)),
          apiCalls: Math.max(0, userData.usage.apiCalls - (userData.limits.apiCalls === -1 ? 999999 : userData.limits.apiCalls))
        },
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        testData: true // Mark as test data
      });

      console.log(`    ✅ Seeded comprehensive data for ${tier} user`);

    } catch (error) {
      console.error(`    ❌ Failed to seed ${tier} user:`, error);
      throw error;
    }
  }

  async cleanTestData() {
    console.log("🧹 Cleaning existing test data...");

    // Clean test users' data
    for (const userData of Object.values(ENHANCED_TEST_PROFILES)) {
      try {
        // Delete user's projects
        const projects = await db.collection('projects').where('userId', '==', userData.uid).get();
        const batch1 = db.batch();
        projects.docs.forEach(doc => batch1.delete(doc.ref));
        if (!projects.empty) await batch1.commit();

        // Delete user's analyses
        const analyses = await db.collection('neuroSeoAnalyses').where('userId', '==', userData.uid).get();
        const batch2 = db.batch();
        analyses.docs.forEach(doc => batch2.delete(doc.ref));
        if (!analyses.empty) await batch2.commit();

        // Delete user's teams
        const teams = await db.collection('teams').where('ownerId', '==', userData.uid).get();
        const batch3 = db.batch();
        teams.docs.forEach(doc => batch3.delete(doc.ref));
        if (!teams.empty) await batch3.commit();

        // Delete user's usage records
        const usage = await db.collection('usage').where('userId', '==', userData.uid).get();
        const batch4 = db.batch();
        usage.docs.forEach(doc => batch4.delete(doc.ref));
        if (!usage.empty) await batch4.commit();

        // Delete user document
        await db.collection('users').doc(userData.uid).delete();

        console.log(`    ✅ Cleaned data for ${userData.email}`);
      } catch (error) {
        console.log(`    ⚠️  Warning: Could not clean all data for ${userData.email}`);
      }
    }

    console.log("✅ Test data cleanup completed");
  }
}

// CLI execution
if (require.main === module) {
  const seeder = new EnhancedTestUserSeeder();

  const command = process.argv[2];

  if (command === 'clean') {
    seeder.cleanTestData()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Cleanup failed:", error);
        process.exit(1);
      });
  } else {
    seeder.seedAllTestUsers()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Test user seeding failed:", error);
        process.exit(1);
      });
  }
}

// CLI execution
if (require.main === module) {
  const seeder = new EnhancedTestUserSeeder();
  seeder.seedAllTestUsers()
    .then(() => {
      console.log("✅ All enhanced test users seeded successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Enhanced test user seeding failed:", error);
      process.exit(1);
    });
}
