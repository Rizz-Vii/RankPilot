/**
 * MCP Integration API Routes
 * Comprehensive MCP server integration endpoints for RankPilot
 */

import { mcpService } from '@/lib/mcp';
import { neuroSEOMCPOrchestrator } from '@/lib/neuroseo/mcp-enhanced';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/mcp/status
 * Get MCP service status and configuration
 */
export async function GET() {
    try {
        const status = mcpService.getServiceStatus();

        return NextResponse.json({
            success: true,
            data: status,
            message: 'MCP service status retrieved successfully',
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to retrieve MCP service status',
        }, { status: 500 });
    }
}

/**
 * POST /api/mcp
 * Main MCP integration endpoint with route-based handling
 */
export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Extract service and action from pathname
        const pathParts = pathname.split('/').filter(Boolean);
        const serviceAction = pathParts.slice(2).join('/'); // Remove 'api/mcp'

        const { query, limit = 10 } = await request.json();

        // Handle HuggingFace model search
        if (serviceAction === 'huggingface/search') {
            if (!query) {
                return NextResponse.json({
                    success: false,
                    error: 'Query parameter is required',
                    message: 'Please provide a search query',
                }, { status: 400 });
            }

            const result = await mcpService.huggingfaceModelSearch(query, limit);

            return NextResponse.json({
                success: result.success,
                data: result.data,
                error: result.error,
                metadata: {
                    source: result.source,
                    timestamp: result.timestamp,
                    requestId: result.requestId,
                },
            });
        }

        // Default response for unsupported routes
        return NextResponse.json({
            success: false,
            error: 'Unsupported MCP service action',
            message: `Service action '${serviceAction}' is not supported`,
            availableActions: [
                'huggingface/search',
                'firecrawl/scrape',
                'sentry/analyze',
                'sequential-thinking/analyze',
                'neuroseo/enhanced-analysis',
            ],
        }, { status: 400 });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'MCP service request failed',
        }, { status: 500 });
    }

    /**
     * POST /api/mcp/firecrawl/scrape
     * Scrape URL via Firecrawl MCP
     */
    async function handleFirecrawlScrape(request: NextRequest) {
        try {
            const { url, options = {} } = await request.json();

            if (!url) {
                return NextResponse.json({
                    success: false,
                    error: 'URL parameter is required',
                    message: 'Please provide a URL to scrape',
                }, { status: 400 });
            }

            const result = await mcpService.firecrawlScrapeUrl(url, options);

            return NextResponse.json({
                success: result.success,
                data: result.data,
                error: result.error,
                metadata: {
                    source: result.source,
                    timestamp: result.timestamp,
                    requestId: result.requestId,
                },
            });
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Firecrawl scraping failed',
            }, { status: 500 });
        }
    }

    /**
     * POST /api/mcp/sentry/analyze
     * Analyze Sentry issue via MCP
     */
    async function handleSentryAnalyze(request: NextRequest) {
        try {
            const { issueId } = await request.json();

            if (!issueId) {
                return NextResponse.json({
                    success: false,
                    error: 'Issue ID parameter is required',
                    message: 'Please provide a Sentry issue ID',
                }, { status: 400 });
            }

            const result = await mcpService.sentryAnalyzeIssue(issueId);

            return NextResponse.json({
                success: result.success,
                data: result.data,
                error: result.error,
                metadata: {
                    source: result.source,
                    timestamp: result.timestamp,
                    requestId: result.requestId,
                },
            });
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Sentry issue analysis failed',
            }, { status: 500 });
        }
    }

    /**
     * POST /api/mcp/sequential-thinking/analyze
     * Analyze problem via Sequential Thinking MCP
     */
    async function handleSequentialThinking(request: NextRequest) {
        try {
            const { problem } = await request.json();

            if (!problem) {
                return NextResponse.json({
                    success: false,
                    error: 'Problem parameter is required',
                    message: 'Please provide a problem to analyze',
                }, { status: 400 });
            }

            const result = await mcpService.sequentialThinkingAnalyze(problem);

            return NextResponse.json({
                success: result.success,
                data: result.data,
                error: result.error,
                metadata: {
                    source: result.source,
                    timestamp: result.timestamp,
                    requestId: result.requestId,
                },
            });
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Sequential thinking analysis failed',
            }, { status: 500 });
        }
    }

    /**
     * POST /api/mcp/neuroseo/enhanced-analysis
     * Run MCP-enhanced NeuroSEO™ analysis
     */
    async function handleEnhancedNeuroSEO(request: NextRequest) {
        try {
            const { url, content, keywords, competitorUrls } = await request.json();

            if (!url || !content || !keywords?.length) {
                return NextResponse.json({
                    success: false,
                    error: 'URL, content, and keywords are required',
                    message: 'Please provide all required parameters',
                }, { status: 400 });
            }

            const result = await neuroSEOMCPOrchestrator.runMCPEnhancedAnalysis({
                url,
                content,
                keywords,
                competitorUrls,
            });

            return NextResponse.json({
                success: true,
                data: result,
                message: 'MCP-enhanced NeuroSEO™ analysis completed successfully',
                metadata: {
                    enhancementFlags: result.enhancementFlags,
                    combinedScore: result.combinedScore,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Enhanced NeuroSEO™ analysis failed',
            }, { status: 500 });
        }
    }
}