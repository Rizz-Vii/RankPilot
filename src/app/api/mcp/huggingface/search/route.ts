/**
 * MCP HuggingFace Search API Route
 * /api/mcp/huggingface/search
 */

import { mcpService } from '@/lib/mcp';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
    try {
        const { query, limit = 10 } = await request.json();

        if (!query) {
            return NextResponse.json({
                success: false,
                _error: 'Query parameter is required',
                message: 'Please provide a search query',
            }, { status: 400 });
        }

        const _result = await mcpService.huggingfaceModelSearch(query, limit);

        return NextResponse.json({
            success: result.success,
            _data: result._data,
            _error: result._error,
            metadata: {
                source: result.source,
                timestamp: result.timestamp,
                requestId: result.requestId,
            },
        });
    } catch (_error) {
        return NextResponse.json({
            success: false,
            _error: error instanceof Error ? error.message : 'Unknown error',
            message: 'HuggingFace model search failed',
        }, { status: 500 });
    }
}
