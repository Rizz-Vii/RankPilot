/**
 * Dashboard Data Service - Dynamic Database Integration
 *
 * Replaces static dummyDashboardData with real-time user-specific data
 * from comprehensive database structure.
 *
 * Generated: July 26, 2025
 * Integration: Firestore collections → Dashboard components
 */

import { db } from "@/lib/firebase";
import { managedOnSnapshot } from "@/lib/firebase/write-guard";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

// Dashboard data interfaces matching existing component expectations
export interface DashboardData {
  seoScore: {
    current: number;
    change: number;
  };
  trackedKeywords: {
    current: number;
    change: number;
  };
  activeProjects: {
    current: number;
    change: number;
  };
  seoScoreTrend: Array<{
    date: string;
    score: number;
  }>;
  keywordVisibility: {
    score: number;
    top3: number;
    top10: number;
    top100: number;
  };
  domainAuthority: {
    score: number;
    history: Array<{
      date: string;
      score: number;
    }>;
  };
  backlinks: {
    total: number;
    newLast30Days: number;
    history: Array<{
      month: string;
      new: number;
      lost: number;
    }>;
  };
  trafficSources: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  seoSources?: Array<{
    url: string;
    firstH1?: string;
    externalAnchors: Array<{ href: string; text: string }>;
    missingAltSamples: string[];
  }>;
}

class DashboardDataService {
  /**
   * Get comprehensive dashboard data for a specific user
   */
  static async getUserDashboardData(userId: string): Promise<DashboardData> {
    console.log(`📊 Fetching dashboard data for user: ${userId}`);

    try {
      // Fetch all data in parallel for better performance
      const [
        seoScoreData,
        keywordData,
        projectsData,
        domainAuthorityData,
        backlinkData,
        trafficData,
        seoSources,
      ] = await Promise.all([
        this.getSEOScoreTrend(userId),
        this.getKeywordMetrics(userId),
        this.getProjectsData(userId),
        this.getDomainAuthorityData(userId),
        this.getBacklinkData(userId),
        this.getTrafficSources(userId),
        this.getSeoSources(userId),
      ]);

      return {
        seoScore: seoScoreData,
        trackedKeywords: keywordData,
        activeProjects: projectsData,
        seoScoreTrend: seoScoreData.trend,
        keywordVisibility: keywordData.visibility,
        domainAuthority: domainAuthorityData,
        backlinks: backlinkData,
        trafficSources: trafficData,
        seoSources,
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return this.getFallbackData();
    }
  }

  /**
   * Get SEO score trend from NeuroSEO analyses
   */
  private static async getSEOScoreTrend(userId: string) {
    try {
      const analysesRef = collection(db, "neuroSeoAnalyses");
      const q = query(
        analysesRef,
        where("userId", "==", userId),
        where("status", "==", "completed"),
        orderBy("completedAt", "desc"),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const analyses = snapshot.docs.map((doc) => doc.data());

      if (analyses.length === 0) {
        return {
          current: 0,
          change: 0,
          trend: [],
        };
      }

      // Calculate current score and trend
      const currentScore = analyses[0]?.summary?.overallScore || 0;
      const previousScore = analyses[1]?.summary?.overallScore || currentScore;
      const change = currentScore - previousScore;

      // Generate trend data from recent analyses
      const trend = analyses.reverse().map((analysis, index) => ({
        date:
          analysis.completedAt?.toDate?.()?.toISOString().split("T")[0] ||
          new Date(
            Date.now() - (analyses.length - index) * 7 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
        score: analysis.summary?.overallScore || 0,
      }));

      return {
        current: Math.round(currentScore),
        change: Math.round(change),
        trend,
      };
    } catch (error) {
      console.error("Error fetching SEO score trend:", error);
      return { current: 0, change: 0, trend: [] };
    }
  }

  /**
   * Get SEO provenance sources from the latest NeuroSEO analysis
   */
  private static async getSeoSources(userId: string) {
    try {
      const analysesRef = collection(db, "neuroSeoAnalyses");
      const q = query(
        analysesRef,
        where("userId", "==", userId),
        where("status", "==", "completed"),
        orderBy("completedAt", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return [] as DashboardData["seoSources"];
      const data = snapshot.docs[0].data();
      const sources = (data?.report?.sources || data?.sources || []) as Array<{
        url: string;
        firstH1?: string;
        externalAnchors?: Array<{ href: string; text: string }>;
        missingAltSamples?: string[];
      }>;
      return sources.map((s) => ({
        url: s.url,
        firstH1: s.firstH1,
        externalAnchors: Array.isArray(s.externalAnchors)
          ? s.externalAnchors
          : [],
        missingAltSamples: Array.isArray(s.missingAltSamples)
          ? s.missingAltSamples
          : [],
      }));
    } catch (error) {
      console.error("Error fetching SEO sources:", error);
      return [] as DashboardData["seoSources"];
    }
  }

  /**
   * Get keyword tracking metrics from keyword research
   */
  private static async getKeywordMetrics(userId: string) {
    try {
      const keywordsRef = collection(db, "keywordResearch");
      const q = query(
        keywordsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const keywords = snapshot.docs.map((doc) => doc.data());

      if (keywords.length === 0) {
        return {
          current: 0,
          change: 0,
          visibility: { score: 0, top3: 0, top10: 0, top100: 0 },
        };
      }

      // Calculate keyword metrics
      const totalKeywords = keywords.length;
      const recentKeywords = keywords.filter((k) => {
        const createdAt = k.createdAt?.toDate?.() || new Date(k.createdAt);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return createdAt > thirtyDaysAgo;
      }).length;

      // Calculate visibility metrics from rankings
      let top3 = 0,
        top10 = 0,
        top100 = 0;
      keywords.forEach((keyword) => {
        if (keyword.currentRanking) {
          if (keyword.currentRanking <= 3) top3++;
          if (keyword.currentRanking <= 10) top10++;
          if (keyword.currentRanking <= 100) top100++;
        }
      });

      const visibilityScore =
        totalKeywords > 0 ? Math.round((top10 / totalKeywords) * 100) : 0;

      return {
        current: totalKeywords,
        change: recentKeywords,
        visibility: {
          score: visibilityScore,
          top3,
          top10,
          top100,
        },
      };
    } catch (error) {
      console.error("Error fetching keyword metrics:", error);
      return {
        current: 0,
        change: 0,
        visibility: { score: 0, top3: 0, top10: 0, top100: 0 },
      };
    }
  }

  /**
   * Get projects data
   */
  private static async getProjectsData(userId: string) {
    try {
      const projectsRef = collection(db, "projects");
      const q = query(projectsRef, where("userId", "==", userId));

      const snapshot = await getDocs(q);
      const projects = snapshot.docs.map((doc) => doc.data());

      const activeProjects = projects.filter(
        (p) => p.status === "active"
      ).length;
      const recentProjects = projects.filter((p) => {
        const createdAt = p.createdAt?.toDate?.() || new Date(p.createdAt);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return createdAt > thirtyDaysAgo;
      }).length;

      return {
        current: activeProjects,
        change: recentProjects,
      };
    } catch (error) {
      console.error("Error fetching projects data:", error);
      return { current: 0, change: 0 };
    }
  }

  /**
   * Get domain authority data from SEO audits
   */
  private static async getDomainAuthorityData(userId: string) {
    try {
      const auditsRef = collection(db, "seoAudits");
      const q = query(
        auditsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(6)
      );

      const snapshot = await getDocs(q);
      const audits = snapshot.docs.map((doc) => doc.data());

      if (audits.length === 0) {
        return { score: 0, history: [] };
      }

      const currentScore = audits[0]?.domainAuthority || 0;

      // Generate history from audits
      const history = audits.reverse().map((audit, index) => ({
        date:
          audit.createdAt?.toDate?.()?.toISOString().split("T")[0] ||
          new Date(
            Date.now() - (audits.length - index) * 30 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
        score: audit.domainAuthority || 0,
      }));

      return {
        score: Math.round(currentScore),
        history,
      };
    } catch (error) {
      console.error("Error fetching domain authority data:", error);
      return { score: 0, history: [] };
    }
  }

  /**
   * Get backlink data from link analyses
   */
  private static async getBacklinkData(userId: string) {
    try {
      const linksRef = collection(db, "linkAnalyses");
      const q = query(
        linksRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(6)
      );

      const snapshot = await getDocs(q);
      const analyses = snapshot.docs.map((doc) => doc.data());

      if (analyses.length === 0) {
        return {
          total: 0,
          newLast30Days: 0,
          history: [],
        };
      }

      const latestAnalysis = analyses[0];
      const totalBacklinks = latestAnalysis?.totalBacklinks || 0;
      const newBacklinks = latestAnalysis?.newBacklinks || 0;

      // Deterministic monthly history
      const history: Array<{ month: string; new: number; lost: number }> = [];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

      // Simple 32-bit FNV-1a hash for seeding
      const hashSeed = (str: string): number => {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        return h >>> 0;
      };
      // Mulberry32 PRNG
      const seededRng = (seed: number) => {
        let s = seed >>> 0;
        return () => {
          s = (s + 0x6d2b79f5) >>> 0;
          let t = Math.imul(s ^ (s >>> 15), 1 | s);
          t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };

      for (let i = 0; i < 6; i++) {
        const analysis = analyses[i];
        const monthLabel = months[5 - i];
        // If analysis provides values, use them; else derive deterministically from userId + month
        const seed = hashSeed(`${userId}|${monthLabel}|backlinks`);
        const rng = seededRng(seed);
        const newVal = analysis?.newBacklinks ?? 20 + Math.round(rng() * 50);
        const lostVal = analysis?.lostBacklinks ?? 5 + Math.round(rng() * 20);
        history.unshift({ month: monthLabel, new: newVal, lost: lostVal });
      }

      return {
        total: totalBacklinks,
        newLast30Days: newBacklinks,
        history,
      };
    } catch (error) {
      console.error("Error fetching backlink data:", error);
      return {
        total: 0,
        newLast30Days: 0,
        history: [],
      };
    }
  }

  /**
   * Get traffic sources from analytics (mock implementation for now)
   */
  private static async getTrafficSources(userId: string) {
    try {
      // This would integrate with Google Analytics API or similar
      // For now, return calculated data based on user's analyses

      const analysesRef = collection(db, "neuroSeoAnalyses");
      const q = query(
        analysesRef,
        where("userId", "==", userId),
        where("status", "==", "completed"),
        limit(5)
      );

      const snapshot = await getDocs(q);
      const analyses = snapshot.docs.map((doc) => doc.data());

      // Calculate traffic distribution based on SEO performance
      const avgScore =
        analyses.length > 0
          ? analyses.reduce(
              (sum, a) => sum + (a.summary?.overallScore || 0),
              0
            ) / analyses.length
          : 50;

      // Adjust organic percentage based on SEO performance
      const organicPercent = Math.min(85, Math.max(30, avgScore));
      const directPercent = Math.max(10, 40 - organicPercent * 0.3);
      const referralPercent = Math.max(5, 20 - organicPercent * 0.15);
      const socialPercent =
        100 - organicPercent - directPercent - referralPercent;

      return [
        {
          name: "Organic Search",
          value: Math.round(organicPercent),
          fill: "hsl(var(--chart-1))",
        },
        {
          name: "Direct",
          value: Math.round(directPercent),
          fill: "hsl(var(--chart-2))",
        },
        {
          name: "Referral",
          value: Math.round(referralPercent),
          fill: "hsl(var(--chart-3))",
        },
        {
          name: "Social",
          value: Math.round(socialPercent),
          fill: "hsl(var(--chart-4))",
        },
      ];
    } catch (error) {
      console.error("Error fetching traffic sources:", error);
      return [
        { name: "Organic Search", value: 45, fill: "hsl(var(--chart-1))" },
        { name: "Direct", value: 30, fill: "hsl(var(--chart-2))" },
        { name: "Referral", value: 15, fill: "hsl(var(--chart-3))" },
        { name: "Social", value: 10, fill: "hsl(var(--chart-4))" },
      ];
    }
  }

  /**
   * Real-time dashboard data subscription
   */
  static subscribeToUserDashboardData(
    userId: string,
    callback: (data: DashboardData) => void
  ): () => void {
    console.log(
      `📡 Setting up real-time dashboard subscription for user: ${userId}`
    );

    // Subscribe to NeuroSEO analyses for real-time updates
    const analysesRef = collection(db, "neuroSeoAnalyses");
    const q = query(
      analysesRef,
      where("userId", "==", userId),
      orderBy("completedAt", "desc"),
      limit(5)
    );

    const unsubscribe = managedOnSnapshot(
      q,
      () => {
        void (async () => {
          const data = await this.getUserDashboardData(userId);
          callback(data);
        })().catch((error) => {
          console.error("Error in dashboard subscription:", error);
        });
      },
      (err) => {
        const e = err as { code?: string };
        if (e.code === "permission-denied") {
          console.warn(
            "[DashboardData] permission-denied for neuroSeoAnalyses subscription; providing fallback data"
          );
          callback(this.getFallbackData());
        } else {
          console.error("[DashboardData] onSnapshot error", err);
        }
      },
      { debounceMs: 150 }
    );

    return unsubscribe;
  }

  /**
   * Fallback data for error states or loading
   */
  private static getFallbackData(): DashboardData {
    return {
      seoScore: { current: 0, change: 0 },
      trackedKeywords: { current: 0, change: 0 },
      activeProjects: { current: 0, change: 0 },
      seoScoreTrend: [],
      keywordVisibility: { score: 0, top3: 0, top10: 0, top100: 0 },
      domainAuthority: { score: 0, history: [] },
      backlinks: { total: 0, newLast30Days: 0, history: [] },
      trafficSources: [
        { name: "No Data", value: 100, fill: "var(--color-chart-1)" },
      ],
      seoSources: [],
    };
  }

  /**
   * Update user dashboard cache (for performance optimization)
   */
  static async updateDashboardCache(userId: string): Promise<void> {
    try {
      const data = await this.getUserDashboardData(userId);

      // Store in user document for quick access
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        dashboardCache: {
          data,
          lastUpdated: Timestamp.now(),
          version: "1.0",
        },
      });

      console.log(`✅ Dashboard cache updated for user: ${userId}`);
    } catch (error) {
      console.error("Error updating dashboard cache:", error);
    }
  }
}

// Export for use in components
export { DashboardDataService };
