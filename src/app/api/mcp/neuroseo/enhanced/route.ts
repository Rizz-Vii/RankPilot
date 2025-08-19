/**
 * MCP NeuroSEO Enhanced Analysis API Route
 * /api/mcp/neuroseo/enhanced
 */

import { neuroSEOMCPOrchestrator } from '@/lib/neuroseo/mcp-enhanced';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

export const POST = withProvenance(async function POST(request: NextRequest) {
    try {
        const { url, content, keywords, competitorUrls } = await request.json();

        if (!url || !content || !keywords?.length) {
            return NextResponse.json(enforceProvenance({ success: false, error: 'URL, content, and keywords are required', message: 'Please provide all required parameters', provenance: 'synthetic' }, { path: 'mcp/neuroseo/enhanced', note: 'validation' }), { status: 400 });
        }

        const result = await neuroSEOMCPOrchestrator.runMCPEnhancedAnalysis({
            url,
            content,
            keywords,
            competitorUrls,
        });

        return NextResponse.json(enforceProvenance({ success: true, data: result, message: 'MCP-enhanced NeuroSEO™ analysis completed successfully', metadata: { enhancementFlags: result.enhancementFlags, combinedScore: result.combinedScore, timestamp: new Date().toISOString() }, provenance: 'live' }, { path: 'mcp/neuroseo/enhanced', note: 'analysis' }));
    } catch (error) {
        return NextResponse.json(enforceProvenance({ success: false, error: error instanceof Error ? error.message : 'Unknown error', message: 'Enhanced NeuroSEO™ analysis failed', provenance: 'synthetic' }, { path: 'mcp/neuroseo/enhanced', note: 'exception' }), { status: 500 });
    }
}, { path: 'mcp/neuroseo/enhanced' });
