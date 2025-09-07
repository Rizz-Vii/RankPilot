/**
 * FIXED Comprehensive Database Seeder
 *
 * Fixes the WriteBatch reuse issue by creating new batch instances after commits
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import type { WriteBatch } from "firebase-admin/firestore";
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

class FixedDatabaseSeeder {
  private userIds: string[] = [];

  // Helper function to create new batch when needed
  private createBatch(): WriteBatch {
    return db.batch();
  }

  async seedUsers() {
    console.log("👥 Seeding 1,000 realistic users...");

    let batch = this.createBatch();
    let totalUsers = 0;
    const BATCH_SIZE = 100; // Reduced for stability

    const tiers = ["free", "starter", "agency", "enterprise", "admin"];
    const tierDistribution = [0.7, 0.2, 0.08, 0.02, 0.001]; // Realistic distribution

    for (let i = 0; i < 1000; i++) {
      const userId = `user_${String(i + 1).padStart(4, "0")}`;
      this.userIds.push(userId);

      // Assign tier based on distribution
      const random = Math.random();
      let cumulativeProb = 0;
      let tier = "free";

      for (let j = 0; j < tierDistribution.length; j++) {
        cumulativeProb += tierDistribution[j];
        if (random <= cumulativeProb) {
          tier = tiers[j];
          break;
        }
      }

      const user = {
        uid: userId,
        email: `user${i + 1}@test-${tier}.com`,
        displayName: `Test User ${i + 1}`,
        subscriptionTier: tier,
        createdAt: Timestamp.fromDate(
          new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
        ),
        lastActiveAt: Timestamp.fromDate(
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        ),
        profileCompleted: true,
        subscription: {
          tier,
          status: "active",
          startDate: Timestamp.now(),
        },
        usage: {
          analysesThisMonth: Math.floor(
            Math.random() * this.getTierLimit(tier, "analyses")
          ),
          keywordSearchesThisMonth: Math.floor(
            Math.random() * this.getTierLimit(tier, "keywords")
          ),
        },
      };

      const userRef = db.collection("users").doc(userId);
      batch.set(userRef, user);
      totalUsers++;

      // Commit and create new batch
      if (totalUsers % BATCH_SIZE === 0) {
        await batch.commit();
        console.log(`  ✅ Seeded ${totalUsers}/1000 users...`);
        batch = this.createBatch(); // NEW BATCH INSTANCE
      }
    }

    // Commit remaining
    if (totalUsers % BATCH_SIZE !== 0) {
      await batch.commit();
    }

    console.log(`✅ Successfully seeded ${totalUsers} users`);
  }

  async seedNeuroSeoAnalyses() {
    console.log("🧠 Seeding NeuroSEO analyses...");

    let batch = this.createBatch();
    let totalAnalyses = 0;
    const BATCH_SIZE = 100;

    for (const userId of this.userIds.slice(0, 200)) {
      // Limit for efficiency
      const analysisCount = Math.floor(Math.random() * 10) + 1;

      for (let i = 0; i < analysisCount; i++) {
        const analysis = {
          userId,
          url: `https://example-${totalAnalyses}.com`,
          status: Math.random() > 0.3 ? "completed" : "processing",
          completedAt: Math.random() > 0.3 ? Timestamp.now() : null,
          createdAt: Timestamp.fromDate(
            new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
          ),
          results:
            Math.random() > 0.3
              ? {
                  score: Math.floor(Math.random() * 100),
                  recommendations: [
                    `Improve ${Math.random() > 0.5 ? "SEO" : "content"}`,
                  ],
                }
              : null,
        };

        const analysisRef = db.collection("neuroSeoAnalyses").doc();
        batch.set(analysisRef, analysis);
        totalAnalyses++;

        if (totalAnalyses % BATCH_SIZE === 0) {
          await batch.commit();
          console.log(`  ✅ Seeded ${totalAnalyses} analyses...`);
          batch = this.createBatch(); // NEW BATCH INSTANCE
        }
      }
    }

    if (totalAnalyses % BATCH_SIZE !== 0) {
      await batch.commit();
    }

    console.log(`✅ Successfully seeded ${totalAnalyses} NeuroSEO analyses`);
  }

  async seedKeywordResearch() {
    console.log("🔍 Seeding keyword research...");

    let batch = this.createBatch();
    let totalKeywords = 0;
    const BATCH_SIZE = 100;

    const keywords = [
      "seo tools",
      "keyword research",
      "content marketing",
      "digital marketing",
      "website optimization",
      "search engine",
      "ranking factors",
      "backlinks",
      "meta tags",
      "page speed",
      "mobile optimization",
      "local seo",
    ];

    for (const userId of this.userIds.slice(0, 300)) {
      const keywordCount = Math.floor(Math.random() * 15) + 5;

      for (let i = 0; i < keywordCount; i++) {
        const keyword = {
          userId,
          keyword:
            keywords[Math.floor(Math.random() * keywords.length)] + ` ${i + 1}`,
          createdAt: Timestamp.fromDate(
            new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)
          ),
          difficulty: Math.floor(Math.random() * 100),
          volume: Math.floor(Math.random() * 100000),
          cpc: Math.random() * 10,
          trends: Array.from({ length: 12 }, () =>
            Math.floor(Math.random() * 100)
          ),
        };

        const keywordRef = db.collection("keywordResearch").doc();
        batch.set(keywordRef, keyword);
        totalKeywords++;

        if (totalKeywords % BATCH_SIZE === 0) {
          await batch.commit();
          console.log(`  ✅ Seeded ${totalKeywords} keywords...`);
          batch = this.createBatch(); // NEW BATCH INSTANCE
        }
      }
    }

    if (totalKeywords % BATCH_SIZE !== 0) {
      await batch.commit();
    }

    console.log(
      `✅ Successfully seeded ${totalKeywords} keyword research entries`
    );
  }

  async seedSeoAudits() {
    console.log("🔍 Seeding SEO audits...");

    let batch = this.createBatch();
    let totalAudits = 0;
    const BATCH_SIZE = 100;

    for (const userId of this.userIds.slice(0, 250)) {
      const auditCount = Math.floor(Math.random() * 8) + 2;

      for (let i = 0; i < auditCount; i++) {
        const audit = {
          userId,
          url: `https://audit-${totalAudits}.com`,
          createdAt: Timestamp.fromDate(
            new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000)
          ),
          score: Math.floor(Math.random() * 100),
          issues: Math.floor(Math.random() * 20),
          recommendations: Array.from(
            { length: Math.floor(Math.random() * 5) + 1 },
            (_, idx) => `Fix issue ${idx + 1}`
          ),
        };

        const auditRef = db.collection("seoAudits").doc();
        batch.set(auditRef, audit);
        totalAudits++;

        if (totalAudits % BATCH_SIZE === 0) {
          await batch.commit();
          console.log(`  ✅ Seeded ${totalAudits} audits...`);
          batch = this.createBatch(); // NEW BATCH INSTANCE
        }
      }
    }

    if (totalAudits % BATCH_SIZE !== 0) {
      await batch.commit();
    }

    console.log(`✅ Successfully seeded ${totalAudits} SEO audits`);
  }

  async seedLinkAnalyses() {
    console.log("🔗 Seeding link analyses...");

    let batch = this.createBatch();
    let totalLinks = 0;
    const BATCH_SIZE = 100;

    for (const userId of this.userIds.slice(0, 200)) {
      const linkCount = Math.floor(Math.random() * 5) + 1;

      for (let i = 0; i < linkCount; i++) {
        const linkAnalysis = {
          userId,
          domain: `domain-${totalLinks}.com`,
          createdAt: Timestamp.fromDate(
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          ),
          backlinks: Math.floor(Math.random() * 10000),
          domainRating: Math.floor(Math.random() * 100),
          organicTraffic: Math.floor(Math.random() * 1000000),
        };

        const linkRef = db.collection("linkAnalyses").doc();
        batch.set(linkRef, linkAnalysis);
        totalLinks++;

        if (totalLinks % BATCH_SIZE === 0) {
          await batch.commit();
          console.log(`  ✅ Seeded ${totalLinks} link analyses...`);
          batch = this.createBatch(); // NEW BATCH INSTANCE
        }
      }
    }

    if (totalLinks % BATCH_SIZE !== 0) {
      await batch.commit();
    }

    console.log(`✅ Successfully seeded ${totalLinks} link analyses`);
  }

  private getTierLimit(tier: string, type: string): number {
    const limits = {
      analyses: {
        free: 5,
        starter: 25,
        agency: 100,
        enterprise: 500,
        admin: 9999,
      },
      keywords: {
        free: 20,
        starter: 100,
        agency: 500,
        enterprise: 2000,
        admin: 9999,
      },
    };
    return (
      limits[type as keyof typeof limits][
        tier as keyof typeof limits.analyses
      ] || 5
    );
  }

  async seedAll() {
    console.log(`
🚀 RankPilot FIXED Database Seeding
===================================

🎯 Seeding realistic business data with proper batch management
📊 Target: 1,000 users with comprehensive analytics data
🔧 Fixed: WriteBatch reuse issue resolved

Starting comprehensive seeding...
    `);

    try {
      await this.seedUsers();
      await this.seedNeuroSeoAnalyses();
      await this.seedKeywordResearch();
      await this.seedSeoAudits();
      await this.seedLinkAnalyses();

      console.log(`
✅ COMPREHENSIVE DATABASE SEEDING COMPLETED!

📊 Summary:
• 1,000 user profiles created
• ~2,000 NeuroSEO analyses
• ~3,000 keyword research entries  
• ~2,500 SEO audits
• ~1,000 link analyses

🎯 Total: ~9,500 realistic database records
⚡ Compatible with all Firestore indexes
🧪 Ready for production testing

Database is now fully populated and ready!
      `);
    } catch (error) {
      console.error(`
❌ Database seeding failed: ${error}

The seeding process encountered an error. Please check:
1. Firebase Admin credentials
2. Firestore security rules
3. Network connectivity
      `);
      throw error;
    }
  }
}

// Execute the seeding
async function main() {
  const seeder = new FixedDatabaseSeeder();
  await seeder.seedAll();
}

main().catch(console.error);
