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
// Removed unused DashboardData import

export class EnhancedDashboardService {

    /**
     * Get comprehensive user insights using optimized index queries
     * Uses: projects (userId+status+createdAt), neuroSeoAnalyses (userId+completedAt)
     */
    static async getUserInsights(userId: string) {
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
                lastAnalysis: ((): Date | undefined => {
                    const v = analyses.docs[0]?.data()?.completedAt as unknown;
                    return toDateOptional(v);
                })(),
                averageScore: this.calculateAverageScore(analyses.docs.map(doc => doc.data() as Record<string, unknown>)),
                projectSuccess: this.calculateProjectSuccessRate(completedProjects.docs.map(doc => doc.data() as Record<string, unknown>))
            };

        } catch (error) {
            console.error("Error fetching user insights:", error);
            return null;
        }
    }

    /**
     * Get team performance metrics using team-based indexes
     * Uses: teams (members.userId+updatedAt)
     */
    static async getTeamMetrics(userId: string) {
        try {
            // Use teams index: members.userId+updatedAt
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
                teams: teams.map(team => ({
                    id: team.id,
                    name: team.name,
                    role: team.members.find((m: any) => m && m.userId === userId)?.role || 'member'
                }))
            };
        } catch (error) {
            console.error("Error fetching team metrics:", error);
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
            const analyses = snapshot.docs.map(doc => doc.data() as Record<string, unknown>);

            if (analyses.length === 0) {
                return { totalCompetitors: 0, averageGap: 0, topOpportunity: null };
            }

            // Calculate insights
            const uniqueCompetitors = new Set(analyses.map(a => String((a as Record<string, unknown>).competitorDomain || ''))).size;
            const gaps = analyses.map(a => Number((a as Record<string, unknown>).gapScore || 0)).filter(score => score > 0);
            const averageGap = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;

            // Find top opportunity
            const topOpportunity = analyses
                .filter(a => (a as Record<string, unknown>).gapScore && (a as Record<string, unknown>).opportunities)
                .sort((a, b) => (Number((b as Record<string, unknown>).gapScore || 0)) - (Number((a as Record<string, unknown>).gapScore || 0)))[0] as Record<string, unknown> | undefined;

            return {
                totalCompetitors: uniqueCompetitors,
                averageGap: Math.round(averageGap),
                topOpportunity: topOpportunity ? {
                    competitor: String(topOpportunity.competitorDomain || ''),
                    opportunity: Array.isArray(topOpportunity.opportunities) ? topOpportunity.opportunities[0] : undefined,
                    gapScore: Number(topOpportunity.gapScore || 0)
                } : null,
                monthlyTrend: this.calculateCompetitorTrend(analyses)
            };

        } catch (error) {
            console.error("Error fetching competitor insights:", error);
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
            const analyses = snapshot.docs.map(doc => doc.data() as Record<string, unknown>);

            if (analyses.length === 0) {
                return { totalContent: 0, averageScore: 0, topPerformer: null };
            }

            const scores = analyses.map(a => Number((a as Record<string, unknown>).overallScore || 0)).filter(score => score > 0);
            const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

            const topPerformer = analyses
                .filter(a => (a as Record<string, unknown>).overallScore)
                .sort((a, b) => (Number((b as Record<string, unknown>).overallScore || 0)) - (Number((a as Record<string, unknown>).overallScore || 0)))[0] as Record<string, unknown> | undefined;

            return {
                totalContent: analyses.length,
                averageScore: Math.round(averageScore),
                topPerformer: topPerformer ? {
                    url: String(topPerformer.url || ''),
                    score: Number(topPerformer.overallScore || 0),
                    title: String(topPerformer.title || 'Untitled')
                } : null,
                recentTrend: this.calculateContentTrend(analyses)
            };

        } catch (error) {
            console.error("Error fetching content metrics:", error);
            return { totalContent: 0, averageScore: 0, topPerformer: null };
        }
    }

    // Helper methods
    private static calculateAverageScore(analyses: Array<Record<string, unknown>>): number {
        if (analyses.length === 0) return 0;
        const scores = analyses.map(a => Number(((a.summary as Record<string, unknown> | undefined)?.overallScore) || 0)).filter(score => score > 0);
        return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    }

    private static calculateProjectSuccessRate(projects: Array<Record<string, unknown>>): number {
        if (projects.length === 0) return 0;
        const successful = projects.filter(p => p.status === 'completed' && (Number(p.successScore) || 0) > 70).length;
        return Math.round((successful / projects.length) * 100);
    }

    private static calculateCompetitorTrend(analyses: Array<Record<string, unknown>>) {
        // Group by month and calculate trend
        const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
        const monthly: Record<string, number[]> = analyses.reduce((acc: Record<string, number[]>, analysis) => {
            const date = toDateOptional(analysis.createdAt) || new Date();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[monthKey]) acc[monthKey] = [];
            const gap = isRec(analysis) ? Number(analysis.gapScore || 0) : 0;
            acc[monthKey].push(gap);

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

    private static calculateContentTrend(analyses: Array<Record<string, unknown>>) {
        // Similar trending calculation for content
        const isRec2 = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
        const monthly: Record<string, number[]> = analyses.reduce((acc: Record<string, number[]>, analysis) => {
            const date = toDateOptional(analysis.createdAt) || new Date();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[monthKey]) acc[monthKey] = [];
            const score = isRec2(analysis) ? Number(analysis.overallScore || 0) : 0;
            acc[monthKey].push(score);

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

function toDateOptional(v: unknown): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    const maybeTs = v as { toDate?: () => Date };
    return typeof maybeTs.toDate === 'function' ? maybeTs.toDate() : undefined;
}
