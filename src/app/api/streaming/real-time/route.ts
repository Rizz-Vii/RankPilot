/**
 * Real-Time Streaming API Route
 * Handles WebSocket connections and Server-Sent Events for real-time data
 */

import { realTimeDataStreamer } from '@/lib/streaming/real-time-data-streamer';
import { allowStreamingMockUser } from '@/lib/flags/demo';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

interface StreamingRequest {
    action: 'register' | 'subscribe' | 'collaborate' | 'metrics';
    clientId?: string;
    connectionType?: 'websocket' | 'sse';
    dashboardId?: string;
    streamTypes?: string[];
    collaborationEvent?: unknown;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as StreamingRequest;
        const authHeader = request.headers.get('authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized - Missing token' },
                { status: 401 }
            );
        }

        // For demo purposes, we can use a mock user only if explicitly allowed
        // In production, verify the JWT token here
        const mockUser: { uid: string; tier: 'enterprise' } | null = allowStreamingMockUser() ? { uid: 'demo-user', tier: 'enterprise' } : null;
        if (!mockUser) {
            return NextResponse.json(
                { error: 'Unauthorized - Mock user disabled' },
                { status: 401 }
            );
        }

        switch (body.action) {
            case 'register':
                if (!body.clientId) {
                    return NextResponse.json(
                        { error: 'Client ID is required' },
                        { status: 400 }
                    );
                }

                const registrationResult = await realTimeDataStreamer.registerClient(
                    body.clientId,
                    mockUser.uid,
                    mockUser.tier,
                    body.connectionType || 'websocket',
                    body.dashboardId
                );

                if (!registrationResult.success) {
                    return NextResponse.json(
                        { error: registrationResult.error },
                        { status: 400 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    client: registrationResult.client,
                    message: 'Client registered successfully'
                });

            case 'subscribe':
                if (!body.clientId || !body.streamTypes) {
                    return NextResponse.json(
                        { error: 'Client ID and stream types are required' },
                        { status: 400 }
                    );
                }

                const subscriptionResult = await realTimeDataStreamer.subscribeToStreams(
                    body.clientId,
                    body.streamTypes
                );

                return NextResponse.json({
                    success: subscriptionResult.success,
                    subscribed: subscriptionResult.subscribed,
                    error: subscriptionResult.error,
                    message: subscriptionResult.success
                        ? `Subscribed to ${subscriptionResult.subscribed.length} streams`
                        : 'Subscription failed'
                });

            case 'collaborate':
                if (!body.collaborationEvent) {
                    return NextResponse.json(
                        { error: 'Collaboration event data is required' },
                        { status: 400 }
                    );
                }

                const ev: any = body.collaborationEvent as any;
                await realTimeDataStreamer.broadcastCollaboration({
                    type: ev?.type,
                    userId: mockUser.uid,
                    userName: ev?.userName || 'Demo User',
                    dashboardId: ev?.dashboardId,
                    data: ev?.data,
                    timestamp: Date.now()
                });

                return NextResponse.json({
                    success: true,
                    message: 'Collaboration event broadcasted'
                });

            case 'metrics':
                const metrics = realTimeDataStreamer.getMetrics();
                return NextResponse.json({
                    success: true,
                    metrics
                });

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('[StreamingAPI] Error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        const clientId = url.searchParams.get('clientId');

        // Server-Sent Events endpoint
        if (action === 'sse') {
            if (!clientId) {
                return NextResponse.json(
                    { error: 'Client ID is required for SSE' },
                    { status: 400 }
                );
            }

            // Create SSE response
            const encoder = new TextEncoder();
            const customReadable = new ReadableStream({
                start(controller) {
                    // Send initial connection message
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({
                            type: 'connection',
                            message: 'SSE connection established',
                            timestamp: Date.now()
                        })}\n\n`)
                    );

                    // Listen for SSE data events
                    const handleSSEData = (id: string, data: unknown) => {
                        if (id === clientId) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                            );
                        }
                    };

                    realTimeDataStreamer.on('sse-data', handleSSEData);

                    // Heartbeat to keep connection alive
                    const heartbeat = setInterval(() => {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                                type: 'heartbeat',
                                timestamp: Date.now()
                            })}\n\n`)
                        );
                    }, 30000);

                    // Cleanup on close
                    request.signal.addEventListener('abort', () => {
                        clearInterval(heartbeat);
                        realTimeDataStreamer.off('sse-data', handleSSEData);
                        realTimeDataStreamer.disconnectClient(clientId);
                        controller.close();
                    });
                }
            });

            return new NextResponse(customReadable, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Cache-Control'
                }
            });
        }

        // Regular GET endpoints
        switch (action) {
            case 'metrics':
                const metrics = realTimeDataStreamer.getMetrics();
                return NextResponse.json({
                    success: true,
                    metrics
                });

            case 'health':
                return NextResponse.json({
                    success: true,
                    status: 'healthy',
                    uptime: process.uptime(),
                    connections: realTimeDataStreamer.getMetrics().totalConnections
                });

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('[StreamingAPI] GET Error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const clientId = url.searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json(
                { error: 'Client ID is required' },
                { status: 400 }
            );
        }

        const disconnected = await realTimeDataStreamer.disconnectClient(clientId);

        return NextResponse.json({
            success: disconnected,
            message: disconnected ? 'Client disconnected successfully' : 'Client not found'
        });

    } catch (error) {
        console.error('[StreamingAPI] DELETE Error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
