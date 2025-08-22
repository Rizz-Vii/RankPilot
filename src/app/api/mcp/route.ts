/**
 * MCP Integration API Routes
 * Comprehensive MCP server integration endpoints for RankPilot
 */

import { mcpService } from '@/lib/mcp';
// Removed unused enhanced analysis orchestrator & per-action handlers for now to satisfy lint; future reinstatement should include dynamic dispatch.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/mcp/status
 * Get MCP service status and configuration
 */
export async function GET() {
    try {
        const status = await mcpService.getServiceStatus();

        return NextResponse.json({
            success: true,
            data: status,
            message: 'MCP service status retrieved successfully',
        });
    } catch (error: unknown) {
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

        const _body = await request.json();
        const { query, limit = 10 } = _body ?? {};

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

    } catch (error: unknown) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'MCP service request failed',
        }, { status: 500 });
    }

}
