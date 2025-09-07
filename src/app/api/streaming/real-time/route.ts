/**
 * Real-Time Streaming API Route
 * Handles WebSocket connections and Server-Sent Events for real-time data
 */

import { extractErrorMessage } from "@/lib/errors/extract-error-message";
import { allowStreamingMockUser } from "@/lib/flags/demo";
import { handleCors } from "@/lib/http/cors";
import type { SSEClient } from "@/lib/http/sse";
import { sse } from "@/lib/http/sse";
import { recordError, recordRouteLatency } from "@/lib/metrics/unified-metrics";
import {
  enforceProvenance,
  enforceProvenanceOnChunk,
} from "@/lib/middleware/provenance";
import { realTimeDataStreamer } from "@/lib/streaming/real-time-data-streamer";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Utility: run an async operation without awaiting it, ensuring errors are handled
function fireAndForget(op: () => Promise<unknown>): void {
  // Intentionally do not return a promise from this function
  void op().catch(() => {
    /* swallow in fire-and-forget */
  });
}

interface StreamingRequest {
  action: "register" | "subscribe" | "collaborate" | "metrics";
  clientId?: string;
  connectionType?: "websocket" | "sse";
  dashboardId?: string;
  streamTypes?: string[];
  collaborationEvent?: unknown;
}

export async function POST(request: NextRequest) {
  const cors = handleCors(request);
  if ("preflight" in cors) return cors.preflight;
  const start = Date.now();
  try {
    const body = (await request.json()) as StreamingRequest;
    const authHeader = request.headers.get("authorization");
    // Ensure background streaming engine is started on first API use
    realTimeDataStreamer.start();

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        enforceProvenance(
          { error: "Unauthorized - Missing token" },
          { path: "streaming/real-time:POST", note: "auth-missing" }
        ),
        { status: 401, headers: cors.headers }
      );
    }

    // For demo purposes, we can use a mock user only if explicitly allowed
    // In production, verify the JWT token here
    const mockUser: { uid: string; tier: "enterprise" } | null =
      allowStreamingMockUser()
        ? { uid: "demo-user", tier: "enterprise" }
        : null;

    if (!mockUser) {
      const res = NextResponse.json(
        enforceProvenance(
          { error: "Unauthorized - Mock user disabled" },
          { path: "streaming/real-time:POST", note: "mock-user-disabled" }
        ),
        { status: 401, headers: cors.headers }
      );
      recordRouteLatency("streaming/real-time:POST", Date.now() - start);
      return res;
    }

    switch (body.action) {
      case "register": {
        if (!body.clientId) {
          const res = NextResponse.json(
            enforceProvenance(
              { error: "Client ID is required" },
              {
                path: "streaming/real-time:POST",
                note: "register-missing-clientId",
              }
            ),
            { status: 400, headers: cors.headers }
          );
          recordRouteLatency("streaming/real-time:POST", Date.now() - start);
          return res;
        }

        // Explicitly reject WebSocket registration on node runtime to avoid silent close
        if ((body.connectionType || "websocket") === "websocket") {
          const res = NextResponse.json(
            enforceProvenance(
              {
                error: "websocket_unsupported_in_node_runtime",
                hint: "Use SSE via GET ?action=sse&clientId=…",
              },
              { path: "streaming/real-time:POST", note: "ws-rejected" }
            ),
            { status: 400, headers: cors.headers }
          );
          recordRouteLatency("streaming/real-time:POST", Date.now() - start);
          return res;
        }

        const registrationResult = await realTimeDataStreamer.registerClient(
          body.clientId,
          mockUser.uid,
          mockUser.tier,
          body.connectionType || "websocket",
          body.dashboardId
        );

        if (!registrationResult.success) {
          return NextResponse.json(
            enforceProvenance(
              { error: registrationResult.error },
              { path: "streaming/real-time:POST", note: "register-failed" }
            ),
            { status: 400, headers: cors.headers }
          );
        }

        const res = NextResponse.json(
          enforceProvenance(
            {
              success: true,
              client: registrationResult.client,
              message: "Client registered successfully",
            },
            { path: "streaming/real-time:POST", note: "register-ok" }
          ),
          { headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:POST", Date.now() - start);
        return res;
      }

      case "subscribe": {
        if (!body.clientId || !body.streamTypes) {
          const res = NextResponse.json(
            enforceProvenance(
              { error: "Client ID and stream types are required" },
              {
                path: "streaming/real-time:POST",
                note: "subscribe-missing-params",
              }
            ),
            { status: 400, headers: cors.headers }
          );
          recordRouteLatency("streaming/real-time:POST", Date.now() - start);
          return res;
        }

        const subscriptionResult =
          await realTimeDataStreamer.subscribeToStreams(
            body.clientId,
            body.streamTypes
          );

        const res = NextResponse.json(
          enforceProvenance(
            {
              success: subscriptionResult.success,
              subscribed: subscriptionResult.subscribed,
              error: subscriptionResult.error,
              message: subscriptionResult.success
                ? `Subscribed to ${subscriptionResult.subscribed.length} streams`
                : "Subscription failed",
            },
            {
              path: "streaming/real-time:POST",
              note: subscriptionResult.success
                ? "subscribe-ok"
                : "subscribe-failed",
            }
          ),
          { headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:POST", Date.now() - start);
        return res;
      }

      case "collaborate": {
        if (!body.collaborationEvent) {
          const res = NextResponse.json(
            enforceProvenance(
              { error: "Collaboration event data is required" },
              { path: "streaming/real-time:POST", note: "collab-missing-event" }
            ),
            { status: 400, headers: cors.headers }
          );
          recordRouteLatency("streaming/real-time:POST", Date.now() - start);
          return res;
        }

        const rawEv = body.collaborationEvent as unknown;
        const ev =
          rawEv && typeof rawEv === "object"
            ? (rawEv as {
                type?: string;
                userName?: string;
                dashboardId?: string;
                data?: unknown;
              })
            : {};

        const typeVal = typeof ev.type === "string" ? ev.type : "widget-edit";
        const dashId = typeof ev.dashboardId === "string" ? ev.dashboardId : "";
        await realTimeDataStreamer.broadcastCollaboration({
          type: typeVal as
            | "user-joined"
            | "user-left"
            | "cursor-move"
            | "widget-edit"
            | "comment-added",
          userId: mockUser.uid,
          userName: typeof ev.userName === "string" ? ev.userName : "Demo User",
          dashboardId: dashId,
          data: ev?.data,
          timestamp: Date.now(),
        });

        const res = NextResponse.json(
          enforceProvenance(
            {
              success: true,
              message: "Collaboration event broadcasted",
            },
            { path: "streaming/real-time:POST", note: "collab-ok" }
          ),
          { headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:POST", Date.now() - start);
        return res;
      }

      case "metrics": {
        const metrics = realTimeDataStreamer.getMetrics();
        const res = NextResponse.json(
          enforceProvenance(
            { success: true, metrics },
            { path: "streaming/real-time:POST", note: "metrics" }
          ),
          { headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:POST", Date.now() - start);
        return res;
      }

      default:
        const res = NextResponse.json(
          enforceProvenance(
            { error: "Invalid action" },
            { path: "streaming/real-time:POST", note: "invalid-action" }
          ),
          { status: 400, headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:POST", Date.now() - start);
        return res;
    }
  } catch (error) {
    console.error("[StreamingAPI] Error:", error);
    recordError("streaming/real-time:POST", "5xx_server");
    recordRouteLatency("streaming/real-time:POST", Date.now() - start);
    return NextResponse.json(
      enforceProvenance(
        {
          error: "Internal server error",
          details: extractErrorMessage(error),
        },
        { path: "streaming/real-time:POST", note: "exception" }
      ),
      { status: 500, headers: cors.headers }
    );
  }
}

export async function GET(request: NextRequest) {
  const cors = handleCors(request, { allowMethods: ["GET", "OPTIONS"] });
  if ("preflight" in cors) return cors.preflight;
  const start = Date.now();
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const clientId = url.searchParams.get("clientId");
    // Ensure engine started for GET operations that use it
    if (action) realTimeDataStreamer.start();

    // Server-Sent Events endpoint
    if (action === "sse") {
      if (!clientId) {
        const res = NextResponse.json(
          enforceProvenance(
            { error: "Client ID is required for SSE" },
            { path: "streaming/real-time:GET", note: "sse-missing-clientId" }
          ),
          { status: 400 }
        );
        recordRouteLatency("streaming/real-time:GET", Date.now() - start);
        return res;
      }

      // Create SSE response via helper
      const handleSseClient: (client: SSEClient) => void = (client) => {
        // Advise client retry interval and initial message
        client.sendRaw("retry: 10000\n\n");
        client.send(
          enforceProvenanceOnChunk(
            {
              type: "connection",
              message: "SSE connection established",
              timestamp: Date.now(),
            },
            { path: "streaming/real-time:sse" }
          )
        );

        // Listen for SSE data events
        const handleSSEData = (id: string, data: unknown): void => {
          if (id === clientId) {
            client.send(
              enforceProvenanceOnChunk(
                data && typeof data === "object"
                  ? (data as Record<string, unknown>)
                  : { message: String(data) },
                { path: "streaming/real-time:sse" }
              )
            );
          }
        };

        realTimeDataStreamer.on("sse-data", handleSSEData);

        // Cleanup on close/abort
        // Note: avoid async handler to satisfy @typescript-eslint/no-misused-promises
        const onAbort = (): void => {
          realTimeDataStreamer.off("sse-data", handleSSEData);
          fireAndForget(async () => {
            try {
              await realTimeDataStreamer.disconnectClient(clientId);
            } catch {
              // best-effort
            }
            client.close();
          });
        };
        request.signal.addEventListener(
          "abort",
          function handleAbortEvent(_evt: Event): void {
            onAbort();
          }
        );
        return;
      };
      const res = sse(request, handleSseClient, {
        heartbeatMs: 15000,
        headers: cors.headers,
      });
      recordRouteLatency("streaming/real-time:GET", Date.now() - start);
      return res;
    }

    // Regular GET endpoints
    switch (action) {
      case "metrics": {
        const metrics = realTimeDataStreamer.getMetrics();
        const res = NextResponse.json(
          enforceProvenance(
            { success: true, metrics },
            { path: "streaming/real-time:GET", note: "metrics" }
          ),
          { headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:GET", Date.now() - start);
        return res;
      }

      case "health": {
        const res = NextResponse.json(
          enforceProvenance(
            {
              success: true,
              status: "healthy",
              uptime: process.uptime(),
              connections: realTimeDataStreamer.getMetrics().totalConnections,
            },
            { path: "streaming/real-time:GET", note: "health" }
          ),
          { headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:GET", Date.now() - start);
        return res;
      }

      default:
        const res = NextResponse.json(
          enforceProvenance(
            { error: "Invalid action" },
            { path: "streaming/real-time:GET", note: "invalid-action" }
          ),
          { status: 400, headers: cors.headers }
        );
        recordRouteLatency("streaming/real-time:GET", Date.now() - start);
        return res;
    }
  } catch (error) {
    console.error("[StreamingAPI] GET Error:", error);
    recordError("streaming/real-time:GET", "5xx_server");
    recordRouteLatency("streaming/real-time:GET", Date.now() - start);
    return NextResponse.json(
      enforceProvenance(
        {
          error: "Internal server error",
          details: extractErrorMessage(error),
        },
        { path: "streaming/real-time:GET", note: "exception" }
      ),
      { status: 500, headers: cors.headers }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const cors = handleCors(request);
  if ("preflight" in cors) return cors.preflight;
  const start = Date.now();
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");

    if (!clientId) {
      const res = NextResponse.json(
        enforceProvenance(
          { error: "Client ID is required" },
          { path: "streaming/real-time:DELETE", note: "missing-clientId" }
        ),
        { status: 400, headers: cors.headers }
      );
      recordRouteLatency("streaming/real-time:DELETE", Date.now() - start);
      return res;
    }

    const disconnected = await realTimeDataStreamer.disconnectClient(clientId);

    const res = NextResponse.json(
      enforceProvenance(
        {
          success: disconnected,
          message: disconnected
            ? "Client disconnected successfully"
            : "Client not found",
        },
        { path: "streaming/real-time:DELETE" }
      ),
      { headers: cors.headers }
    );
    recordRouteLatency("streaming/real-time:DELETE", Date.now() - start);
    return res;
  } catch (error) {
    console.error("[StreamingAPI] DELETE Error:", error);
    recordError("streaming/real-time:DELETE", "5xx_server");
    recordRouteLatency("streaming/real-time:DELETE", Date.now() - start);
    return NextResponse.json(
      enforceProvenance(
        {
          error: "Internal server error",
          details: extractErrorMessage(error),
        },
        { path: "streaming/real-time:DELETE", note: "exception" }
      ),
      { status: 500, headers: cors.headers }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const cors = handleCors(request);
  return "preflight" in cors
    ? cors.preflight
    : new Response(null, { status: 204, headers: cors.headers });
}
