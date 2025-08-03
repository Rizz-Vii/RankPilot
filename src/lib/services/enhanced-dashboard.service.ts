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
    getDocs,
    doc,
    getDoc,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DashboardData } from "./dashboard-data.service";

export class EnhancedDashboardService {

    /**
     * Get comprehensive user insights using optimized index queries
     * Uses: projects (userId+status+createdAt), neuroSeoAnalyses (userId+completedAt)
     */
    static async getUserInsights(userId: string) {
        try {
            // Use projects _index: userId+status+createdAt
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

            // Use neuroSeoAnalyses _index: userId+completedAt
            const recentAnalysesQuery = query(
                collection(db, "neuroSeoAnalyses"),
                where("userId", "==", userId),
                orderBy("completedAt", "desc"),
                limit(20)
            );

            // Use keywordResearch _index: userId+createdAt
            const keywordQuery = query(
                collection(db, "keywordResearch"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc"),
                limit(50)
            );

            const [activeProjects, completedProjects, analyses, keywords] = await Promise.all([
                getDocs(activeProjectsQuery),
                getDocs(completedProjectsQuery),
                getDocs(recentAnalysesQuery),
                getDocs(keywordQuery)
            ]);

            return {
                activeProjects: activeProjects.size,
                completedProjects: completedProjects.size,
                totalAnalyses: analyses.size,
                trackedKeywords: keywords.size,
                lastAnalysis: analyses.docs[0]?.data()?.completedAt?.toDate(),
                averageScore: this.calculateAverageScore(analyses.docs.map(doc => doc.data())),
                projectSuccess: this.calculateProjectSuccessRate(completedProjects.docs.map(doc => doc.data()))
            };

        } catch (_error) {
            console.error("Error fetching user insights:", _error);
            return null;
        }
    }

    /**
     * Get team performance metrics using team-based indexes
     * Uses: teams (members.userId+updatedAt)
     */
    static async getTeamMetrics(userId: string) {
        try {
            // Use teams _index: members.userId+updatedAt
            const teamQuery = query(
                collection(db, "teams"),
                where("members.userId", "array-contains", userId),
                orderBy("updatedAt", "desc")
            );

            const teamSnapshot = await getDocs(teamQuery);
            const teams = teamSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || 'Untitled Team',
                members: doc.data().members || [],
                ...doc.data()
            }));

            if (teams.length === 0) {
                return { memberOf: 0, teamProjects: 0, teamAnalyses: 0 };
            }

            // Get aggregated team data
            let totalTeamProjects = 0;
            const totalTeamAnalyses = 0;

            for (const team of teams) {
                // Use projects _index: teamId+status+createdAt (if we add teamId to projects)
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
                teams: teams.map(team => ({
                    id: team.id,
                    name: team.name,
                    role: (team.members as Array<{ userId: string; role?: string }>).find((m) => m.userId === userId)?.role || 'member'
                }))
            };
        } catch (_error) {
            console.error("Error fetching team metrics:", _error);
            return { memberOf: 0, teamProjects: 0, teamAnalyses: 0, teams: [] };
        }
    }

    /**
     * Get competitor analysis insights using optimized queries
     * Uses: competitorAnalyses (userId+createdAt)
     */
    static async getCompetitorInsights(userId: string) {
        try {
            const competitorQuery = query(
                collection(db, "competitorAnalyses"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc"),
                limit(30)
            );

            const snapshot = await getDocs(competitorQuery);
            const analyses = snapshot.docs.map(doc => doc.data());

            if (analyses.length === 0) {
                return { totalCompetitors: 0, averageGap: 0, topOpportunity: null };
            }

            // Calculate insights
            const uniqueCompetitors = new Set(analyses.map(a => a.competitorDomain)).size;
            const gaps = analyses.map(a => a.gapScore || 0).filter(score => score > 0);
            const averageGap = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;

            // Find top opportunity
            const topOpportunity = analyses
                .filter(a => a.gapScore && a.opportunities)
                .sort((a, b) => (b.gapScore || 0) - (a.gapScore || 0))[0];

            return {
                totalCompetitors: uniqueCompetitors,
                averageGap: Math.round(averageGap),
                topOpportunity: topOpportunity ? {
                    competitor: topOpportunity.competitorDomain,
                    opportunity: topOpportunity.opportunities[0],
                    gapScore: topOpportunity.gapScore
                } : null,
                monthlyTrend: this.calculateCompetitorTrend(analyses)
            };

        } catch (_error) {
            console.error("Error fetching competitor insights:", _error);
            return { totalCompetitors: 0, averageGap: 0, topOpportunity: null };
        }
    }

    /**
     * Get content performance using content analyses indexes
     * Uses: contentAnalyses (userId+createdAt)
     */
    static async getContentMetrics(userId: string) {
        try {
            const contentQuery = query(
                collection(db, "contentAnalyses"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc"),
                limit(50)
            );

            const snapshot = await getDocs(contentQuery);
            const analyses = snapshot.docs.map(doc => doc.data());

            if (analyses.length === 0) {
                return { totalContent: 0, averageScore: 0, topPerformer: null };
            }

            const scores = analyses.map(a => a.overallScore || 0).filter(score => score > 0);
            const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

            const topPerformer = analyses
                .filter(a => a.overallScore)
                .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))[0];

            return {
                totalContent: analyses.length,
                averageScore: Math.round(averageScore),
                topPerformer: topPerformer ? {
                    url: topPerformer.url,
                    score: topPerformer.overallScore,
                    title: topPerformer.title || 'Untitled'
                } : null,
                recentTrend: this.calculateContentTrend(analyses)
            };

        } catch (_error) {
            console.error("Error fetching content metrics:", _error);
            return { totalContent: 0, averageScore: 0, topPerformer: null };
        }
    }

    // Helper methods
    private static calculateAverageScore(analyses: unknown[]): number {
        if (analyses.length === 0) return 0;
        const scores = (analyses as Array<{ summary?: { overallScore?: number } }>)
            .map(a => a.summary?.overallScore || 0)
            .filter(score => score > 0);
        return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    }

    private static calculateProjectSuccessRate(projects: unknown[]): number {
        if (projects.length === 0) return 0;
        const successful = (projects as Array<{ status?: string; successScore?: number }>)
            .filter(p => p.status === 'completed' && (p.successScore || 0) > 70).length;
        return Math.round((successful / projects.length) * 100);
    }

    private static calculateCompetitorTrend(analyses: unknown[]) {
        // Group by month and calculate trend
        const monthly = (analyses as Array<{ createdAt?: Timestamp; gapScore?: number }>).reduce((acc, analysis) => {
            const date = analysis.createdAt?.toDate() || new Date();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(analysis.gapScore || 0);

            return acc;
        }, {} as Record<string, number[]>);

        return Object.entries(monthly)
            .map(([month, scores]) => ({
                month,
                averageGap: Math.round((scores as number[]).reduce((sum: number, score: number) => sum + score, 0) / (scores as number[]).length),
                analyses: (scores as number[]).length
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    private static calculateContentTrend(analyses: unknown[]) {
        // Similar trending calculation for content
        const monthly = (analyses as Array<{ createdAt?: Timestamp; overallScore?: number }>).reduce((acc, analysis) => {
            const date = analysis.createdAt?.toDate() || new Date();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(analysis.overallScore || 0);

            return acc;
        }, {} as Record<string, number[]>);

        return Object.entries(monthly)
            .map(([month, scores]) => ({
                month,
                averageScore: Math.round((scores as number[]).reduce((sum: number, score: number) => sum + score, 0) / (scores as number[]).length),
                content: (scores as number[]).length
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }
}