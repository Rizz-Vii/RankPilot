/**
 * Competitive Intelligence API Route
 * Handles competitor tracking and analysis via Firecrawl MCP
 */

import { firecrawlCompetitiveIntelligence } from '@/lib/intelligence/firecrawl-competitive-intelligence';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
// Import CompetitorMetric type
import type { CompetitorMetric } from '@/lib/intelligence/firecrawl-competitive-intelligence';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';

    try {
        initializeApp({
            projectId,
        });
    } catch (_error) {
        console.error('[CompetitiveIntelligenceAPI] Firebase Admin initialization _error:', _error);
    }
}

interface CompetitorRequestBody {
    action: 'add' | 'analyze' | 'list' | 'update' | 'delete' | 'report' | 'get';
    competitorId?: string;
    domain?: string;
    name?: string;
    industry?: string;
    targetKeywords?: string[];
    trackingConfig?: unknown;
    reportConfig?: {
        competitorIds: string[];
        analysisType: 'overview' | 'keyword-gap' | 'content-gap' | 'technical' | 'comprehensive';
    };
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { _error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        const auth = getAuth();

        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (_error) {
            console.error('[CompetitiveIntelligenceAPI] Token verification _error:', _error);
            return NextResponse.json(
                { _error: 'Invalid authentication token' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;
        const userTier = decodedToken.tier || 'free';

        // Check tier access for competitive intelligence
        if (!['agency', 'enterprise', 'admin'].includes(userTier)) {
            return NextResponse.json(
                { _error: 'Competitive intelligence requires Agency tier or higher' },
                { status: 403 }
            );
        }

        const body: CompetitorRequestBody = await request.json();

        switch (body.action) {
            case 'add':
                if (!body.domain) {
                    return NextResponse.json(
                        { _error: 'Domain is required for adding competitor' },
                        { status: 400 }
                    );
                }

                const competitor = await firecrawlCompetitiveIntelligence.addCompetitor(
                    userId,
                    body.domain,
                    {
                        name: body.name,
                        industry: body.industry,
                        targetKeywords: body.targetKeywords,
                        trackingConfig: body.trackingConfig as {
                            crawlFrequency: 'daily' | 'weekly' | 'monthly';
                            pages: string[];
                            metrics: CompetitorMetric[];
                            alertThresholds: Record<string, number>;
                        } | undefined
                    }
                );

                return NextResponse.json({
                    success: true,
                    competitor: {
                        id: competitor.id,
                        domain: competitor.domain,
                        name: competitor.name,
                        industry: competitor.industry,
                        created: competitor.metadata.created
                    }
                });

            case 'analyze':
                if (!body.competitorId) {
                    return NextResponse.json(
                        { _error: 'Competitor ID is required for analysis' },
                        { status: 400 }
                    );
                }

                await firecrawlCompetitiveIntelligence.analyzeCompetitor(body.competitorId);

                return NextResponse.json({
                    success: true,
                    message: 'Analysis completed successfully'
                });

            case 'list':
                const userCompetitors = firecrawlCompetitiveIntelligence.getUserCompetitors(userId);

                return NextResponse.json({
                    success: true,
                    competitors: userCompetitors.map(c => ({
                        id: c.id,
                        domain: c.domain,
                        name: c.name,
                        industry: c.industry,
                        trackingFrequency: c.trackingConfig.crawlFrequency,
                        lastAnalysis: c.lastAnalysis ? {
                            timestamp: c.lastAnalysis.timestamp,
                            status: c.lastAnalysis.status,
                            changesCount: c.lastAnalysis.changes.length
                        } : null,
                        analysisCount: c.metadata.analysisCount,
                        created: c.metadata.created
                    }))
                });

            case 'update':
                if (!body.competitorId) {
                    return NextResponse.json(
                        { _error: 'Competitor ID is required for update' },
                        { status: 400 }
                    );
                }

                const updated = firecrawlCompetitiveIntelligence.updateCompetitor(
                    body.competitorId,
                    {
                        name: body.name,
                        industry: body.industry,
                        targetKeywords: body.targetKeywords,
                        trackingConfig: body.trackingConfig as {
                            crawlFrequency: 'daily' | 'weekly' | 'monthly';
                            pages: string[];
                            metrics: CompetitorMetric[];
                            alertThresholds: Record<string, number>;
                        } | undefined
                    }
                );

                if (!updated) {
                    return NextResponse.json(
                        { _error: 'Competitor not found or update failed' },
                        { status: 404 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    message: 'Competitor updated successfully'
                });

            case 'delete':
                if (!body.competitorId) {
                    return NextResponse.json(
                        { _error: 'Competitor ID is required for deletion' },
                        { status: 400 }
                    );
                }

                const deleted = firecrawlCompetitiveIntelligence.deleteCompetitor(body.competitorId, userId);

                if (!deleted) {
                    return NextResponse.json(
                        { _error: 'Competitor not found or deletion failed' },
                        { status: 404 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    message: 'Competitor deleted successfully'
                });

            case 'report':
                if (!body.reportConfig?.competitorIds || body.reportConfig.competitorIds.length === 0) {
                    return NextResponse.json(
                        { _error: 'Competitor IDs are required for report generation' },
                        { status: 400 }
                    );
                }

                const report = await firecrawlCompetitiveIntelligence.generateCompetitiveReport(
                    userId,
                    body.reportConfig.competitorIds,
                    body.reportConfig.analysisType || 'comprehensive'
                );

                return NextResponse.json({
                    success: true,
                    report: {
                        id: report.id,
                        competitors: report.competitors,
                        analysisType: report.analysisType,
                        timeframe: report.timeframe,
                        findings: {
                            opportunitiesCount: report.findings.opportunities.length,
                            threatsCount: report.findings.threats.length,
                            insightsCount: report.findings.insights.length,
                            recommendationsCount: report.findings.recommendations.length
                        },
                        metadata: report.metadata
                    },
                    downloadUrl: `/api/intelligence/competitive/download/${report.id}`
                });

            case 'get':
                if (!body.competitorId) {
                    return NextResponse.json(
                        { _error: 'Competitor ID is required' },
                        { status: 400 }
                    );
                }

                const competitorData = firecrawlCompetitiveIntelligence.getCompetitor(body.competitorId);

                if (!competitorData || competitorData.metadata.userId !== userId) {
                    return NextResponse.json(
                        { _error: 'Competitor not found' },
                        { status: 404 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    competitor: {
                        id: competitorData.id,
                        domain: competitorData.domain,
                        name: competitorData.name,
                        description: competitorData.description,
                        industry: competitorData.industry,
                        targetKeywords: competitorData.targetKeywords,
                        trackingConfig: competitorData.trackingConfig,
                        lastAnalysis: competitorData.lastAnalysis,
                        metadata: competitorData.metadata
                    }
                });

            default:
                return NextResponse.json(
                    { _error: 'Invalid action specified' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('[CompetitiveIntelligenceAPI] Error:', error);
        return NextResponse.json(
            {
                _error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { _error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        const auth = getAuth();

        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (_error) {
            console.error('[CompetitiveIntelligenceAPI] Token verification _error:', _error);
            return NextResponse.json(
                { _error: 'Invalid authentication token' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;
        const userTier = decodedToken.tier || 'free';

        // Check tier access
        if (!['agency', 'enterprise', 'admin'].includes(userTier)) {
            return NextResponse.json(
                { _error: 'Competitive intelligence requires Agency tier or higher' },
                { status: 403 }
            );
        }

        // Get user's competitive intelligence overview
        const userCompetitors = firecrawlCompetitiveIntelligence.getUserCompetitors(userId);

        const overview = {
            totalCompetitors: userCompetitors.length,
            activeAnalyses: userCompetitors.filter(c =>
                c.lastAnalysis?.timestamp &&
                Date.now() - c.lastAnalysis.timestamp < 7 * 24 * 60 * 60 * 1000
            ).length,
            totalAnalyses: userCompetitors.reduce((sum, c) => sum + c.metadata.analysisCount, 0),
            recentChanges: userCompetitors
                .filter(c => c.lastAnalysis?.changes)
                .reduce((sum, c) => sum + (c.lastAnalysis?.changes.length || 0), 0),
            tierLimits: {
                agency: { competitors: 5, reports: 10 },
                enterprise: { competitors: 25, reports: 50 },
                admin: { competitors: 'unlimited', reports: 'unlimited' }
            }
        };

        return NextResponse.json({
            success: true,
            overview,
            competitors: userCompetitors.map(c => ({
                id: c.id,
                domain: c.domain,
                name: c.name,
                industry: c.industry,
                trackingFrequency: c.trackingConfig.crawlFrequency,
                lastAnalysis: c.lastAnalysis ? {
                    timestamp: c.lastAnalysis.timestamp,
                    status: c.lastAnalysis.status,
                    changesCount: c.lastAnalysis.changes.length
                } : null,
                analysisCount: c.metadata.analysisCount,
                created: c.metadata.created
            }))
        });

    } catch (_error) {
        console.error('[CompetitiveIntelligenceAPI] Error:', _error);
        return NextResponse.json(
            {
                _error: 'Internal server error',
                details: _error instanceof Error ? _error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
