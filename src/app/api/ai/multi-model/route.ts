/**
 * Multi-Model AI Orchestration API Route
 * Implements Priority 1 Advanced AI Optimization from DevReady Phase 3
 */

import { multiModelOrchestrator, MultiModelRequest } from '@/lib/ai/multi-model-orchestrator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { task, input, options, userTier, userId } = body;

        // Validate required fields
        if (!task || !input || !userTier || !userId) {
            return NextResponse.json({
                success: false,
                _error: 'Missing required fields: task, input, userTier, userId'
            }, { status: 400 });
        }

        // Validate task type
        const validTasks = ['text-generation', 'text-classification', 'summarization', 'question-answering', 'sentiment-analysis'];
        if (!validTasks.includes(task)) {
            return NextResponse.json({
                success: false,
                _error: `Invalid task type. Must be one of: ${validTasks.join(', ')}`
            }, { status: 400 });
        }

        // Create multi-model request
        const multiModelRequest: MultiModelRequest = {
            task,
            input,
            options,
            userTier,
            userId
        };

        // Process request through multi-model orchestrator
        const result = await multiModelOrchestrator.processRequest(multiModelRequest);

        // Return response
        return NextResponse.json(result);

    } catch (_error) {
        console.error('[Multi-Model API] Error:', _error);
        return NextResponse.json({
            success: false,
            _error: 'Internal server error during multi-model processing'
        }, { status: 500 });
    }
}

export async function GET(_request: NextRequest) {
    try {
        // Get performance analytics
        const analytics = multiModelOrchestrator.getPerformanceAnalytics();

        return NextResponse.json({
            success: true,
            _data: {
                analytics,
                timestamp: new Date().toISOString(),
                status: 'operational'
            }
        });

    } catch (_error) {
        console.error('[Multi-Model API] Analytics _error:', _error);
        return NextResponse.json({
            success: false,
            _error: 'Failed to retrieve performance analytics'
        }, { status: 500 });
    }
}
