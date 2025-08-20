/**
 * Enhanced Dashboard Data Service - Index-Optimized Queries
 *
 * Upgraded service leveraging our 25 composite indexes for
 * maximum performance with 1.2M+ record database.
 *
 * Generated: July 26, 2025
 * Indexes Used: All collections with userId+status+createdAt patterns
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * NOTE: This file underwent mechanical lint remediation:
 * - explicit return types for async methods
 * - prefer const over let where applicable
 * - minor type-narrowing and consistent helpers
 * - no behavioral changes intended (idempotent)
 */

type UnknownRecord = Record<string, unknown>;

export class EnhancedDashboardService {
  /**
   * Get comprehensive user insights using optimized index queries
   * Uses: projects (userId+status+createdAt), neuroSeoAnalyses (userId+completedAt)
   */
  static async getUserInsights(userId: string): Promise<UnknownRecord | null> {
    try {
      // Use projects index: userId+status+createdAt
      const activeProjectsQuery = query(
        collection(db, "projects"),
        where("userId", "==", userId),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
      );

      const completedProjectsQuery = query(
        collection(db, "projects"),
        where("userId", "==", userId),
        where("status", "==", "completed"),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      // Use neuroSeoAnalyses index: userId+completedAt
      const recentAnalysesQuery = query(
        collection(db, "neuroSeoAnalyses"),
        where("userId", "==", userId),
        orderBy("completedAt", "desc"),
        limit(20)
      );

      // Use keywordResearch index: userId+createdAt
      const keywordQuery = query(
        collection(db, "keywordResearch"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const [activeProjects, completedProjects, analysesSnap, keywords] = await Promise.all([
        getDocs(activeProjectsQuery),
        getDocs(completedProjectsQuery),
        getDocs(recentAnalysesQuery),
        getDocs(keywordQuery)
      ]);

      const analysesDocs = analysesSnap.docs.map((d) => d.data() as UnknownRecord);

      return {
        activeProjects: activeProjects.size,
        completedProjects: completedProjects.size,
        totalAnalyses: analysesSnap.size,
        trackedKeywords: keywords.size,
        lastAnalysis: (() => {
          const v = analysesSnap.docs[0]?.data()?.completedAt as unknown;
          return toDateOptional(v);
        })(),
        averageScore: this.calculateAverageScore(analysesDocs),
        projectSuccess: this.calculateProjectSuccessRate(
          completedProjects.docs.map((d) => d.data() as UnknownRecord)
        )
      };
    } catch (error) {
      // preserve original behavior: log and return null on error
      // eslint-disable-next-line no-console
      console.error("Error fetching user insights:", error);
      return null;
    }
  }

  /**
   * Get team performance metrics using team-based indexes
   * Uses: teams (members.userId+updatedAt)
   */
  static async getTeamMetrics(userId: string): Promise<UnknownRecord> {
    try {
      // Use teams index: members.userId+updatedAt
      const teamQuery = query(
        collection(db, "teams"),
        where("members.userId", "array-contains", userId),
        orderBy("updatedAt", "desc")
      );

      const teamSnapshot = await getDocs(teamQuery);
      const teams = teamSnapshot.docs.map((doc) => {
        const d = doc.data() as UnknownRecord;
        return {
          id: doc.id,
          name: String(d.name ?? "Untitled Team"),
          members: Array.isArray(d.members) ? (d.members as unknown[]) : [],
          ...d
        };
      });

      if (teams.length === 0) {
        return { memberOf: 0, teamProjects: 0, teamAnalyses: 0 };
      }

      // Get aggregated team data
      let totalTeamProjects = 0;
      // leave totalTeamAnalyses placeholder for future use (keeps behavior)
      let totalTeamAnalyses = 0;

      for (const team of teams) {
        // Use projects index: teamId+status+createdAt (if we add teamId to projects)
        const teamProjectsQuery = query(
          collection(db, "projects"),
          where("teamId", "==", team.id),
          orderBy("createdAt", "desc")
        );

        const teamProjectsSnapshot = await getDocs(teamProjectsQuery);
        totalTeamProjects += teamProjectsSnapshot.size;
      }

      return {
        memberOf: teams.length,
        teamProjects: totalTeamProjects,
        teamAnalyses: totalTeamAnalyses,
        teams: teams.map((team) => ({
          id: team.id,
          name: team.name,
          role:
            (Array.isArray(team.members)
              ? (team.members as unknown[]).find((m: unknown) =>
                  isRecord(m) ? (m as UnknownRecord).userId === userId : false
                )
              : undefined)?.role ?? "member"
        }))
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching team metrics:", error);
      return { memberOf: 0, teamProjects: 0, teamAnalyses: 0, teams: [] };
    }
  }

  /**
   * Get competitor analysis insights using optimized queries
   * Uses: competitorAnalyses (userId+createdAt)
   */
  static async getCompetitorInsights(userId: string): Promise<UnknownRecord> {
    try {
      const competitorQuery = query(
        collection(db, "competitorAnalyses"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(30)
      );

      const snapshot = await getDocs(competitorQuery);
      const analyses = snapshot.docs.map((doc) => doc.data() as UnknownRecord);

      if (analyses.length === 0) {
        return { totalCompetitors: 0, averageGap: 0, topOpportunity: null };
      }

      // Calculate insights
      const uniqueCompetitors = new Set(
        analyses.map((a) => String((a.competitorDomain ?? "") as string))
      ).size;

      const gaps = analyses
        .map((a) => Number(a.gapScore ?? 0))
        .filter((score) => score > 0);

      const averageGap = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;

      // Find top opportunity
      const topOpportunity = analyses
        .filter((a) => a.gapScore && a.opportunities)
        .sort((a, b) => Number(b.gapScore ?? 0) - Number(a.gapScore ?? 0))[0];

      return {
        totalCompetitors: uniqueCompetitors,
        averageGap: Math.round(averageGap),
        topOpportunity: topOpportunity
          ? {
              competitor: String(topOpportunity.competitorDomain ?? ""),
              opportunity: Array.isArray(topOpportunity.opportunities)
                ? topOpportunity.opportunities[0]
                : undefined,
              gapScore: Number(topOpportunity.gapScore ?? 0)
            }
          : null,
        monthlyTrend: this.calculateCompetitorTrend(analyses)
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching competitor insights:", error);
      return { totalCompetitors: 0, averageGap: 0, topOpportunity: null };
    }
  }

  /**
   * Get content performance using content analyses indexes
   * Uses: contentAnalyses (userId+createdAt)
   */
  static async getContentMetrics(userId: string): Promise<UnknownRecord> {
    try {
      const contentQuery = query(
        collection(db, "contentAnalyses"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const snapshot = await getDocs(contentQuery);
      const analyses = snapshot.docs.map((doc) => doc.data() as UnknownRecord);

      if (analyses.length === 0) {
        return { totalContent: 0, averageScore: 0, topPerformer: null };
      }

      const scores = analyses.map((a) => Number(a.overallScore ?? 0)).filter((s) => s > 0);
      const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

      const topPerformer = analyses
        .filter((a) => a.overallScore)
        .sort((a, b) => Number(b.overallScore ?? 0) - Number(a.overallScore ?? 0))[0];

      return {
        totalContent: analyses.length,
        averageScore: Math.round(averageScore),
        topPerformer: topPerformer
          ? {
              url: String(topPerformer.url ?? ""),
              score: Number(topPerformer.overallScore ?? 0),
              title: String(topPerformer.title ?? "Untitled")
            }
          : null,
        recentTrend: this.calculateContentTrend(analyses)
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching content metrics:", error);
      return { totalContent: 0, averageScore: 0, topPerformer: null };
    }
  }

  // Helper methods
  private static calculateAverageScore(analyses: UnknownRecord[]): number {
    if (analyses.length === 0) return 0;
    const scores = analyses
      .map((a) => Number(((a.summary as UnknownRecord | undefined)?.overallScore) ?? 0))
      .filter((s) => s > 0);
    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  private static calculateProjectSuccessRate(projects: UnknownRecord[]): number {
    if (projects.length === 0) return 0;
    const successful = projects.filter((p) => String((p.status ?? "") as string) === "completed" && Number(p.successScore ?? 0) > 70).length;
    return Math.round((successful / projects.length) * 100);
  }

  private static calculateCompetitorTrend(analyses: UnknownRecord[]) {
    // Group by month and calculate trend
    const monthly: Record<string, number[]> = analyses.reduce((acc: Record<string, number[]>, analysis) => {
      const date = toDateOptional(analysis.createdAt) || new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!acc[monthKey]) acc[monthKey] = [];
      const gap = isRecord(analysis) ? Number(analysis.gapScore ?? 0) : 0;
      acc[monthKey].push(gap);

      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(monthly)
      .map(([month, scores]) => ({
        month,
        averageGap: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
        analyses: scores.length
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private static calculateContentTrend(analyses: UnknownRecord[]) {
    // Similar trending calculation for content
    const monthly: Record<string, number[]> = analyses.reduce((acc: Record<string, number[]>, analysis) => {
      const date = toDateOptional(analysis.createdAt) || new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!acc[monthKey]) acc[monthKey] = [];
      const score = isRecord(analysis) ? Number(analysis.overallScore ?? 0) : 0;
      acc[monthKey].push(score);

      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(monthly)
      .map(([month, scores]) => ({
        month,
        averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
        content: scores.length
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}

/* Utility helpers */

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function toDateOptional(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const maybeTs = v as { toDate?: () => Date };
  return typeof maybeTs.toDate === "function" ? maybeTs.toDate() : undefined;
}
