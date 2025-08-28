/**
 * Competitive Intelligence API Route
 * Handles competitor tracking and analysis via Firecrawl MCP
 */

import { extractErrorMessage } from '@/lib/errors/extract-error-message';
import { adminAuth } from '@/lib/firebase-admin';
import type { CompetitorMetric } from '@/lib/intelligence/firecrawl-competitive-intelligence';
import { firecrawlCompetitiveIntelligence } from '@/lib/intelligence/firecrawl-competitive-intelligence';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Firebase Admin is initialized centrally in '@/lib/firebase-admin'.

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

type TrackingConfig = {
    crawlFrequency: 'daily' | 'weekly' | 'monthly';
    pages: string[];
    metrics: CompetitorMetric[];
    alertThresholds: Record<string, number>;
};

function narrowTrackingConfig(input: unknown): TrackingConfig | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const obj = input as Record<string, unknown>;
    if (!('crawlFrequency' in obj)) return undefined;
    const cf = obj.crawlFrequency;
    if (cf !== 'daily' && cf !== 'weekly' && cf !== 'monthly') return undefined;
    const pages = Array.isArray(obj.pages) ? obj.pages.filter(p => typeof p === 'string') as string[] : [];
    // Convert raw metric identifiers to placeholder CompetitorMetric objects; downstream logic can enrich later.
    const metrics = Array.isArray(obj.metrics)
        ? obj.metrics.filter(m => typeof m === 'string').map(m => ({
            name: m as string,
            type: 'seo' as const,
            value: 0,
            timestamp: Date.now(),
            source: 'user'
        }))
        : [];
    const alertThresholds: Record<string, number> = (typeof obj.alertThresholds === 'object' && obj.alertThresholds !== null)
        ? Object.entries(obj.alertThresholds as Record<string, unknown>)
            .reduce<Record<string, number>>((acc, [k, v]) => { if (typeof v === 'number') acc[k] = v; return acc; }, {})
        : {};
    return { crawlFrequency: cf, pages, metrics, alertThresholds };
}

export const POST = withProvenance(async function POST(request: NextRequest) {
    const nreq = request;
    try {
        const authHeader = nreq.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'Missing or invalid authorization header', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'auth' }), { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken: { uid: string; tier?: string } | null = null;
        try {
            decodedToken = await adminAuth.verifyIdToken(token) as { uid: string; tier?: string };
        } catch (error) {
            console.error('[CompetitiveIntelligenceAPI] Token verification error:', error);
            return NextResponse.json(enforceProvenance({ success: false, error: 'Invalid authentication token', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'auth' }), { status: 401 });
        }

        const userId = decodedToken!.uid;
        const userTier = decodedToken!.tier || 'free';

        // Check tier access for competitive intelligence
        if (!['agency', 'enterprise', 'admin'].includes(userTier)) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'Competitive intelligence requires Agency tier or higher', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'tier' }), { status: 403 });
        }

        const body: CompetitorRequestBody = await nreq.json();

        // Narrow trackingConfig if present
        const trackingConfig = narrowTrackingConfig(body.trackingConfig);

        switch (body.action) {
            case 'add':
                if (!body.domain) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Domain is required for adding competitor', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'validation' }), { status: 400 });
                }

                const competitor = await firecrawlCompetitiveIntelligence.addCompetitor(
                    userId,
                    body.domain,
                    {
                        name: body.name,
                        industry: body.industry,
                        targetKeywords: body.targetKeywords,
                        trackingConfig
                    }
                );

                return NextResponse.json(enforceProvenance({ success: true, competitor: { id: competitor.id, domain: competitor.domain, name: competitor.name, industry: competitor.industry, created: competitor.metadata.created }, provenance: 'live' }, { path: 'intelligence/competitive', note: 'add' }));

            case 'analyze':
                if (!body.competitorId) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor ID is required for analysis', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'validation' }), { status: 400 });
                }

                await firecrawlCompetitiveIntelligence.analyzeCompetitor(body.competitorId);

                return NextResponse.json(enforceProvenance({ success: true, message: 'Analysis completed successfully', provenance: 'live' }, { path: 'intelligence/competitive', note: 'analyze' }));

            case 'list': {
                const url = new URL(nreq.url);
                const pageRaw = Number(url.searchParams.get('page') || '1');
                const pageSizeRaw = Number(url.searchParams.get('pageSize') || '25');
                const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
                const pageSize = Math.max(1, Math.min(100, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 25));
                const userCompetitors = firecrawlCompetitiveIntelligence.getUserCompetitors(userId);
                const total = userCompetitors.length;
                const start = (page - 1) * pageSize;
                const end = Math.min(total, start + pageSize);
                const slice = start < total ? userCompetitors.slice(start, end) : [];

                return NextResponse.json(enforceProvenance({ success: true, page, pageSize, total, competitors: slice.map(c => ({ id: c.id, domain: c.domain, name: c.name, industry: c.industry, trackingFrequency: c.trackingConfig.crawlFrequency, lastAnalysis: c.lastAnalysis ? { timestamp: c.lastAnalysis.timestamp, status: c.lastAnalysis.status, changesCount: c.lastAnalysis.changes.length } : null, analysisCount: c.metadata.analysisCount, created: c.metadata.created })), provenance: 'live' }, { path: 'intelligence/competitive', note: 'list' }));
            }

            case 'update':
                if (!body.competitorId) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor ID is required for update', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'validation' }), { status: 400 });
                }

                const updated = firecrawlCompetitiveIntelligence.updateCompetitor(
                    body.competitorId,
                    {
                        name: body.name,
                        industry: body.industry,
                        targetKeywords: body.targetKeywords,
                        trackingConfig
                    }
                );

                if (!updated) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor not found or update failed', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'not_found' }), { status: 404 });
                }

                return NextResponse.json(enforceProvenance({ success: true, message: 'Competitor updated successfully', provenance: 'live' }, { path: 'intelligence/competitive', note: 'update' }));

            case 'delete':
                if (!body.competitorId) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor ID is required for deletion', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'validation' }), { status: 400 });
                }

                const deleted = firecrawlCompetitiveIntelligence.deleteCompetitor(body.competitorId, userId);

                if (!deleted) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor not found or deletion failed', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'not_found' }), { status: 404 });
                }

                return NextResponse.json(enforceProvenance({ success: true, message: 'Competitor deleted successfully', provenance: 'live' }, { path: 'intelligence/competitive', note: 'delete' }));

            case 'report':
                if (!body.reportConfig?.competitorIds || body.reportConfig.competitorIds.length === 0) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor IDs are required for report generation', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'validation' }), { status: 400 });
                }

                const report = await firecrawlCompetitiveIntelligence.generateCompetitiveReport(
                    userId,
                    body.reportConfig.competitorIds,
                    body.reportConfig.analysisType || 'comprehensive'
                );

                return NextResponse.json(enforceProvenance({ success: true, report: { id: report.id, competitors: report.competitors, analysisType: report.analysisType, timeframe: report.timeframe, findings: { opportunitiesCount: report.findings.opportunities.length, threatsCount: report.findings.threats.length, insightsCount: report.findings.insights.length, recommendationsCount: report.findings.recommendations.length }, metadata: report.metadata }, downloadUrl: `/api/intelligence/competitive/download/${report.id}`, provenance: 'live' }, { path: 'intelligence/competitive', note: 'report' }));

            case 'get':
                if (!body.competitorId) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor ID is required', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'validation' }), { status: 400 });
                }

                const competitorData = firecrawlCompetitiveIntelligence.getCompetitor(body.competitorId);

                if (!competitorData || competitorData.metadata.userId !== userId) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'Competitor not found', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'not_found' }), { status: 404 });
                }

                return NextResponse.json(enforceProvenance({ success: true, competitor: { id: competitorData.id, domain: competitorData.domain, name: competitorData.name, description: competitorData.description, industry: competitorData.industry, targetKeywords: competitorData.targetKeywords, trackingConfig: competitorData.trackingConfig, lastAnalysis: competitorData.lastAnalysis, metadata: competitorData.metadata }, provenance: 'live' }, { path: 'intelligence/competitive', note: 'get' }));

            default:
                return NextResponse.json(enforceProvenance({ success: false, error: 'Invalid action specified', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'invalid_action' }), { status: 400 });
        }

    } catch (error) {
        console.error('[CompetitiveIntelligenceAPI] Error:', error);
        return NextResponse.json(
            enforceProvenance({ success: false, error: 'Internal server error', details: extractErrorMessage(error), provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'exception' }),
            { status: 500 }
        );
    }
}, { path: 'intelligence/competitive' });

export const GET = withProvenance(async function GET(request: NextRequest) {
    const nreq = request;
    try {
        const authHeader = nreq.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'Missing or invalid authorization header', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'auth' }), { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken: { uid: string; tier?: string } | null = null;
        try {
            decodedToken = await adminAuth.verifyIdToken(token) as { uid: string; tier?: string };
        } catch (error) {
            console.error('[CompetitiveIntelligenceAPI] Token verification error:', error);
            return NextResponse.json(enforceProvenance({ success: false, error: 'Invalid authentication token', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'auth' }), { status: 401 });
        }

        const userId = decodedToken!.uid;
        const userTier = decodedToken!.tier || 'free';

        // Check tier access
        if (!['agency', 'enterprise', 'admin'].includes(userTier)) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'Competitive intelligence requires Agency tier or higher', provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'tier' }), { status: 403 });
        }

        // Get user's competitive intelligence overview with pagination
        const url = new URL(nreq.url);
        const pageRaw = Number(url.searchParams.get('page') || '1');
        const pageSizeRaw = Number(url.searchParams.get('pageSize') || '25');
        const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
        const pageSize = Math.max(1, Math.min(100, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 25));
        const userCompetitors = firecrawlCompetitiveIntelligence.getUserCompetitors(userId);
        const total = userCompetitors.length;
        const start = (page - 1) * pageSize;
        const end = Math.min(total, start + pageSize);
        const slice = start < total ? userCompetitors.slice(start, end) : [];

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

        return NextResponse.json(enforceProvenance({ success: true, overview, page, pageSize, total, competitors: slice.map(c => ({ id: c.id, domain: c.domain, name: c.name, industry: c.industry, trackingFrequency: c.trackingConfig.crawlFrequency, lastAnalysis: c.lastAnalysis ? { timestamp: c.lastAnalysis.timestamp, status: c.lastAnalysis.status, changesCount: c.lastAnalysis.changes.length } : null, analysisCount: c.metadata.analysisCount, created: c.metadata.created })), provenance: 'live' }, { path: 'intelligence/competitive', note: 'overview' }));

    } catch (error) {
        console.error('[CompetitiveIntelligenceAPI] Error:', error);
        return NextResponse.json(
            enforceProvenance({ success: false, error: 'Internal server error', details: extractErrorMessage(error), provenance: 'synthetic' }, { path: 'intelligence/competitive', note: 'exception' }),
            { status: 500 }
        );
    }
}, { path: 'intelligence/competitive' });
