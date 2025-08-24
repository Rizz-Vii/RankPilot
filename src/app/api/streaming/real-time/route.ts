/**
 * Real-Time Streaming API Route
 * Handles WebSocket connections and Server-Sent Events for real-time data
 */

import { extractErrorMessage } from '@/lib/errors/extract-error-message';
import { allowStreamingMockUser } from '@/lib/flags/demo';
import { recordError, recordRouteLatency } from '@/lib/metrics/unified-metrics';
import { enforceProvenance, enforceProvenanceOnChunk } from '@/lib/middleware/provenance';
import { realTimeDataStreamer } from '@/lib/streaming/real-time-data-streamer';
import type { NextRequest } from 'next/server';
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
  const start = Date.now();
  try {
    const body = (await request.json()) as StreamingRequest;
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(enforceProvenance({ error: 'Unauthorized - Missing token' }, { path: 'streaming/real-time:POST', note: 'auth-missing' }), { status: 401 });
    }

    // For demo purposes, we can use a mock user only if explicitly allowed
    // In production, verify the JWT token here
    const mockUser: { uid: string; tier: 'enterprise' } | null = allowStreamingMockUser()
      ? { uid: 'demo-user', tier: 'enterprise' }
      : null;

    if (!mockUser) {
      const res = NextResponse.json(enforceProvenance({ error: 'Unauthorized - Mock user disabled' }, { path: 'streaming/real-time:POST', note: 'mock-user-disabled' }), { status: 401 });
      recordRouteLatency('streaming/real-time:POST', Date.now() - start);
      return res;
    }

    switch (body.action) {
      case 'register': {
        if (!body.clientId) {
          const res = NextResponse.json(enforceProvenance({ error: 'Client ID is required' }, { path: 'streaming/real-time:POST', note: 'register-missing-clientId' }), { status: 400 });
          recordRouteLatency('streaming/real-time:POST', Date.now() - start);
          return res;
        }

        // Explicitly reject WebSocket registration on node runtime to avoid silent close
        if ((body.connectionType || 'websocket') === 'websocket') {
          const res = NextResponse.json(enforceProvenance({ error: 'websocket_unsupported_in_node_runtime', hint: 'Use SSE via GET ?action=sse&clientId=…' }, { path: 'streaming/real-time:POST', note: 'ws-rejected' }), { status: 400 });
          recordRouteLatency('streaming/real-time:POST', Date.now() - start);
          return res;
        }

        const registrationResult = await realTimeDataStreamer.registerClient(
          body.clientId,
          mockUser.uid,
          mockUser.tier,
          body.connectionType || 'websocket',
          body.dashboardId
        );

        if (!registrationResult.success) {
          return NextResponse.json(enforceProvenance({ error: registrationResult.error }, { path: 'streaming/real-time:POST', note: 'register-failed' }), { status: 400 });
        }

        const res = NextResponse.json(enforceProvenance({
          success: true,
          client: registrationResult.client,
          message: 'Client registered successfully'
        }, { path: 'streaming/real-time:POST', note: 'register-ok' }));
        recordRouteLatency('streaming/real-time:POST', Date.now() - start);
        return res;
      }

      case 'subscribe': {
        if (!body.clientId || !body.streamTypes) {
          const res = NextResponse.json(enforceProvenance({ error: 'Client ID and stream types are required' }, { path: 'streaming/real-time:POST', note: 'subscribe-missing-params' }), { status: 400 });
          recordRouteLatency('streaming/real-time:POST', Date.now() - start);
          return res;
        }

        const subscriptionResult = await realTimeDataStreamer.subscribeToStreams(body.clientId, body.streamTypes);

        const res = NextResponse.json(enforceProvenance({
          success: subscriptionResult.success,
          subscribed: subscriptionResult.subscribed,
          error: subscriptionResult.error,
          message: subscriptionResult.success
            ? `Subscribed to ${subscriptionResult.subscribed.length} streams`
            : 'Subscription failed'
        }, { path: 'streaming/real-time:POST', note: subscriptionResult.success ? 'subscribe-ok' : 'subscribe-failed' }));
        recordRouteLatency('streaming/real-time:POST', Date.now() - start);
        return res;
      }

      case 'collaborate': {
        if (!body.collaborationEvent) {
          const res = NextResponse.json(enforceProvenance({ error: 'Collaboration event data is required' }, { path: 'streaming/real-time:POST', note: 'collab-missing-event' }), { status: 400 });
          recordRouteLatency('streaming/real-time:POST', Date.now() - start);
          return res;
        }

        const rawEv = body.collaborationEvent as unknown;
        const ev = (rawEv && typeof rawEv === 'object') ? rawEv as { type?: string; userName?: string; dashboardId?: string; data?: unknown } : {};

        const typeVal = typeof ev.type === 'string' ? ev.type : 'widget-edit';
        const dashId = typeof ev.dashboardId === 'string' ? ev.dashboardId : '';
        await realTimeDataStreamer.broadcastCollaboration({
          type: typeVal as 'user-joined' | 'user-left' | 'cursor-move' | 'widget-edit' | 'comment-added',
          userId: mockUser.uid,
          userName: typeof ev.userName === 'string' ? ev.userName : 'Demo User',
          dashboardId: dashId,
          data: ev?.data,
          timestamp: Date.now()
        });

        const res = NextResponse.json(enforceProvenance({
          success: true,
          message: 'Collaboration event broadcasted'
        }, { path: 'streaming/real-time:POST', note: 'collab-ok' }));
        recordRouteLatency('streaming/real-time:POST', Date.now() - start);
        return res;
      }

      case 'metrics': {
        const metrics = realTimeDataStreamer.getMetrics();
        const res = NextResponse.json(enforceProvenance({ success: true, metrics }, { path: 'streaming/real-time:POST', note: 'metrics' }));
        recordRouteLatency('streaming/real-time:POST', Date.now() - start);
        return res;
      }

      default:
        const res = NextResponse.json(enforceProvenance({ error: 'Invalid action' }, { path: 'streaming/real-time:POST', note: 'invalid-action' }), { status: 400 });
        recordRouteLatency('streaming/real-time:POST', Date.now() - start);
        return res;
    }
  } catch (error) {
    console.error('[StreamingAPI] Error:', error);
    recordError('streaming/real-time:POST', '5xx_server');
    recordRouteLatency('streaming/real-time:POST', Date.now() - start);
    return NextResponse.json(
      enforceProvenance({
        error: 'Internal server error',
        details: extractErrorMessage(error)
      }, { path: 'streaming/real-time:POST', note: 'exception' }),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const clientId = url.searchParams.get('clientId');

    // Server-Sent Events endpoint
    if (action === 'sse') {
      if (!clientId) {
        const res = NextResponse.json(enforceProvenance({ error: 'Client ID is required for SSE' }, { path: 'streaming/real-time:GET', note: 'sse-missing-clientId' }), { status: 400 });
        recordRouteLatency('streaming/real-time:GET', Date.now() - start);
        return res;
      }

      // Create SSE response
      const encoder = new TextEncoder();

      const customReadable = new ReadableStream({
        start(controller) {
          // Send initial connection message
          const safeEnqueue = (payload: unknown) => {
            try {
              const body: Record<string, unknown> = (payload && typeof payload === 'object')
                ? payload as Record<string, unknown>
                : { message: String(payload) };
              const wrapped = enforceProvenanceOnChunk(body, { path: 'streaming/real-time:sse' });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(wrapped)}\n\n`));
            } catch {
              try { controller.close(); } catch { /* noop */ }
            }
          };

          // Advise client retry interval and initial message
          try { controller.enqueue(encoder.encode('retry: 10000\n\n')); } catch { /* ignore */ }
          safeEnqueue({ type: 'connection', message: 'SSE connection established', timestamp: Date.now() });

          // Listen for SSE data events
          const handleSSEData = (id: string, data: unknown): void => {
            if (id === clientId) {
              safeEnqueue(data);
            }
          };

          realTimeDataStreamer.on('sse-data', handleSSEData);

          // Heartbeat to keep connection alive
          const heartbeat = setInterval(() => {
            safeEnqueue({ type: 'heartbeat', timestamp: Date.now() });
          }, 15000);

          // Cleanup on close
          const onAbort = (): void => {
            clearInterval(heartbeat as unknown as number);
            realTimeDataStreamer.off('sse-data', handleSSEData);
            void realTimeDataStreamer.disconnectClient(clientId);
            controller.close();
          };

          request.signal.addEventListener('abort', onAbort);
        }
      });

      const res = new NextResponse(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Keep-Alive': 'timeout=60',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        }
      });
      recordRouteLatency('streaming/real-time:GET', Date.now() - start);
      return res;
    }

    // Regular GET endpoints
    switch (action) {
      case 'metrics': {
        const metrics = realTimeDataStreamer.getMetrics();
        const res = NextResponse.json(enforceProvenance({ success: true, metrics }, { path: 'streaming/real-time:GET', note: 'metrics' }));
        recordRouteLatency('streaming/real-time:GET', Date.now() - start);
        return res;
      }

      case 'health': {
        const res = NextResponse.json(enforceProvenance({
          success: true,
          status: 'healthy',
          uptime: process.uptime(),
          connections: realTimeDataStreamer.getMetrics().totalConnections
        }, { path: 'streaming/real-time:GET', note: 'health' }));
        recordRouteLatency('streaming/real-time:GET', Date.now() - start);
        return res;
      }

      default:
        const res = NextResponse.json(enforceProvenance({ error: 'Invalid action' }, { path: 'streaming/real-time:GET', note: 'invalid-action' }), { status: 400 });
        recordRouteLatency('streaming/real-time:GET', Date.now() - start);
        return res;
    }
  } catch (error) {
    console.error('[StreamingAPI] GET Error:', error);
    recordError('streaming/real-time:GET', '5xx_server');
    recordRouteLatency('streaming/real-time:GET', Date.now() - start);
    return NextResponse.json(
      enforceProvenance({
        error: 'Internal server error',
        details: extractErrorMessage(error)
      }, { path: 'streaming/real-time:GET', note: 'exception' }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const start = Date.now();
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');

    if (!clientId) {
      const res = NextResponse.json(enforceProvenance({ error: 'Client ID is required' }, { path: 'streaming/real-time:DELETE', note: 'missing-clientId' }), { status: 400 });
      recordRouteLatency('streaming/real-time:DELETE', Date.now() - start);
      return res;
    }

    const disconnected = await realTimeDataStreamer.disconnectClient(clientId);

    const res = NextResponse.json(enforceProvenance({
      success: disconnected,
      message: disconnected ? 'Client disconnected successfully' : 'Client not found'
    }, { path: 'streaming/real-time:DELETE' }));
    recordRouteLatency('streaming/real-time:DELETE', Date.now() - start);
    return res;
  } catch (error) {
    console.error('[StreamingAPI] DELETE Error:', error);
    recordError('streaming/real-time:DELETE', '5xx_server');
    recordRouteLatency('streaming/real-time:DELETE', Date.now() - start);
    return NextResponse.json(
      enforceProvenance({
        error: 'Internal server error',
        details: extractErrorMessage(error)
      }, { path: 'streaming/real-time:DELETE', note: 'exception' }),
      { status: 500 }
    );
  }
}
