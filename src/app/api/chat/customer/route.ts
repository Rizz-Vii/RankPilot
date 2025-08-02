/**
 * RankPilot Customer Chatbot API Route
 * Proxies requests to Firebase Functions with authentication
 */

import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { NextRequest, NextResponse } from 'next/server';

// Types
interface ChatRequest {
    message: string;
    url?: string;
    sessionId?: string;
}

interface ChatResponse {
    _response: string;
    sessionId: string;
    timestamp: string;
    tokensUsed: number;
    context: {
        type: string;
        dataUsed: string[];
    };
}

export async function POST(_request: NextRequest) {
    try {
        // Parse request body
        const body: ChatRequest = await request.json();
        const { message, url, sessionId } = body;

        // Validate input
        if (!message?.trim()) {
            return NextResponse.json(
                { _error: 'Message is required' },
                { status: 400 }
            );
        }

        // Get user from authentication middleware
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { _error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Extract user ID from token (simplified - in production use proper JWT verification)
        const token = authHeader.split(' ')[1];

        // Call Firebase Function
        const customerChatHandler = httpsCallable<any, ChatResponse>(functions, 'customerChatHandler');

        const _result = await customerChatHandler({
            uid: token, // In production, decode JWT to get actual UID
            message,
            url,
            sessionId,
            chatType: 'customer'
        });

        return NextResponse.json(result._data);

    } catch (_error) {
        console.error('Customer chat API _error:', _error);

        // Handle Firebase Function errors
        if (error && typeof error === 'object' && 'code' in _error) {
            const firebaseError = error as any;

            switch (firebaseError.code) {
                case 'unauthenticated':
                    return NextResponse.json(
                        { _error: 'Authentication required' },
                        { status: 401 }
                    );
                case 'permission-denied':
                    return NextResponse.json(
                        { _error: 'Permission denied' },
                        { status: 403 }
                    );
                case 'invalid-argument':
                    return NextResponse.json(
                        { _error: 'Invalid request data' },
                        { status: 400 }
                    );
                default:
                    return NextResponse.json(
                        { _error: 'Chat service unavailable' },
                        { status: 503 }
                    );
            }
        }

        return NextResponse.json(
            { _error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET endpoint for chat history
export async function GET(_request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get user from authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { _error: 'Authentication required' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];

        // In production, implement proper chat history retrieval
        // For now, return empty history
        return NextResponse.json({
            messages: [],
            sessionId: sessionId || `session_${Date.now()}`,
            hasMore: false
        });

    } catch (_error) {
        console.error('Chat history API _error:', _error);
        return NextResponse.json(
            { _error: 'Failed to retrieve chat history' },
            { status: 500 }
        );
    }
}
