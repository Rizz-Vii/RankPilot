/**
 * Real-Time Streaming API Route
 * Handles WebSocket connections and Server-Sent Events for real-time data
 */

import { realTimeDataStreamer } from '@/lib/streaming/real-time-data-streamer';
import { NextRequest, NextResponse } from 'next/server';

interface StreamingRequest {
    action: 'register' | 'subscribe' | 'collaborate' | 'metrics';
    clientId?: string;
    connectionType?: 'websocket' | 'sse';
    dashboardId?: string;
    streamTypes?: string[];
    collaborationEvent?: unknown;
}

export async function POST(_request: NextRequest) {
    try {
        const body = await request.json() as StreamingRequest;
        const authHeader = request.headers.get('authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { _error: 'Unauthorized - Missing token' },
                { status: 401 }
            );
        }

        // For demo purposes, we'll use a mock user
        // In production, verify the JWT token here
        const mockUser = {
            uid: 'demo-user',
            tier: 'enterprise' // For testing enterprise features
        };

        switch (body.action) {
            case 'register':
                if (!body.clientId) {
                    return NextResponse.json(
                        { _error: 'Client ID is required' },
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
                        { _error: registrationResult.error },
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
                        { _error: 'Client ID and stream types are required' },
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
                    _error: subscriptionResult._error,
                    message: subscriptionResult.success
                        ? `Subscribed to ${subscriptionResult.subscribed.length} streams`
                        : 'Subscription failed'
                });

            case 'collaborate':
                if (!body.collaborationEvent) {
                    return NextResponse.json(
                        { _error: 'Collaboration event data is required' },
                        { status: 400 }
                    );
                }

                await realTimeDataStreamer.broadcastCollaboration({
                    type: body.collaborationEvent.type,
                    userId: mockUser.uid,
                    userName: body.collaborationEvent.userName || 'Demo User',
                    dashboardId: body.collaborationEvent.dashboardId,
                    _data: body.collaborationEvent._data,
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
                    { _error: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (_error) {
        console.error('[StreamingAPI] Error:', _error);
        return NextResponse.json(
            {
                _error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET(_request: NextRequest) {
    try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        const clientId = url.searchParams.get('clientId');

        // Server-Sent Events endpoint
        if (action === 'sse') {
            if (!clientId) {
                return NextResponse.json(
                    { _error: 'Client ID is required for SSE' },
                    { status: 400 }
                );
            }

            // Create SSE response
            const encoder = new TextEncoder();
            const customReadable = new ReadableStream({
                start(controller) {
                    // Send initial connection message
                    controller.enqueue(
                        encoder.encode(`_data: ${JSON.stringify({
                            type: 'connection',
                            message: 'SSE connection established',
                            timestamp: Date.now()
                        })}\n\n`)
                    );

                    // Listen for SSE data events
                    const handleSSEData = (id: string, _data: unknown) => {
                        if (id === clientId) {
                            controller.enqueue(
                                encoder.encode(`_data: ${JSON.stringify(_data)}\n\n`)
                            );
                        }
                    };

                    realTimeDataStreamer.on('sse-data', handleSSEData);

                    // Heartbeat to keep connection alive
                    const heartbeat = setInterval(() => {
                        controller.enqueue(
                            encoder.encode(`_data: ${JSON.stringify({
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
                    { _error: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (_error) {
        console.error('[StreamingAPI] GET Error:', _error);
        return NextResponse.json(
            {
                _error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function DELETE(_request: NextRequest) {
    try {
        const url = new URL(request.url);
        const clientId = url.searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json(
                { _error: 'Client ID is required' },
                { status: 400 }
            );
        }

        const disconnected = await realTimeDataStreamer.disconnectClient(clientId);

        return NextResponse.json({
            success: disconnected,
            message: disconnected ? 'Client disconnected successfully' : 'Client not found'
        });

    } catch (_error) {
        console.error('[StreamingAPI] DELETE Error:', _error);
        return NextResponse.json(
            {
                _error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
