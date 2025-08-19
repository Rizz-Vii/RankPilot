/**
 * MCP HuggingFace Search API Route
 * /api/mcp/huggingface/search
 */

import { mcpService } from '@/lib/mcp';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { query, limit = 10 } = await request.json();

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
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'HuggingFace model search failed',
        }, { status: 500 });
    }
}
