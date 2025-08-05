/**
 * Conversational SEO AI API Route
 * Implements Priority 1 Conversational AI Enhancement from DevReady Phase 3
 */

import { conversationalSEOEngine } from '@/lib/ai/conversational-seo-engine';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, sessionId, message, userId, userTier } = body;

        switch (action) {
            case 'start': {
                if (!userId || !userTier) {
                    return NextResponse.json({
                        success: false,
                        _error: 'Missing required fields: userId, userTier'
                    }, { status: 400 });
                }

                const newSessionId = await conversationalSEOEngine.startConversation(userId, userTier);

                return NextResponse.json({
                    success: true,
                    _data: {
                        sessionId: newSessionId,
                        message: 'Conversation started successfully'
                    }
                });
            }

            case 'message': {
                if (!sessionId || !message) {
                    return NextResponse.json({
                        success: false,
                        _error: 'Missing required fields: sessionId, message'
                    }, { status: 400 });
                }

                const response = await conversationalSEOEngine.processMessage(sessionId, message);

                return NextResponse.json({
                    success: true,
                    _data: response
                });
            } default:
                return NextResponse.json({
                    success: false,
                    _error: 'Invalid action. Supported actions: start, message'
                }, { status: 400 });
        }

    } catch (error) {
        console.error('[Conversational SEO API] Error:', error);
        return NextResponse.json({
            success: false,
            _error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}

export async function GET(_request: NextRequest) {
    return NextResponse.json({
        success: true,
        _data: {
            status: 'operational',
            features: [
                'Chat-based SEO analysis',
                'Multi-turn dialogue',
                'Personalized recommendations',
                'Knowledge base integration',
                'Context-aware conversations'
            ],
            supportedTiers: ['free', 'starter', 'agency', 'enterprise', 'admin']
        }
    });
}
