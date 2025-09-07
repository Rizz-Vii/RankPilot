/**
 * Multi-Model AI Orchestration API Route
 * Implements Priority 1 Advanced AI Optimization from DevReady Phase 3
 */

import type { MultiModelRequest } from "@/lib/ai/multi-model-orchestrator";
import { multiModelOrchestrator } from "@/lib/ai/multi-model-orchestrator";
import { adminDb } from "@/lib/firebase-admin";
import {
  recordError,
  recordFallback,
  recordRateLimitRejection,
  recordRouteLatency,
} from "@/lib/metrics/unified-metrics";
import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import {
  enforceTeamRateLimit,
  TeamRateLimitError,
} from "@/lib/rate-limit/team-rate-limit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export const POST = withProvenance(
  async function POST(request: NextRequest) {
    const start = Date.now();
    try {
      // Parse request body
      const body = await request.json();
      const { task, input, options, userTier, userId, teamId } = body;
      if (typeof teamId === "string" && teamId) {
        try {
          await enforceTeamRateLimit(adminDb, teamId, {
            routeKey: "ai/multi-model",
          });
        } catch (e: unknown) {
          if (e instanceof TeamRateLimitError) {
            recordRateLimitRejection("ai/multi-model");
            recordRateLimitRejection(`team:${teamId}`);
            recordRouteLatency("ai/multi-model", Date.now() - start);
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "rate_limited",
                  retryAfter: e.retryAfterSeconds,
                  provenance: "synthetic",
                },
                { path: "ai/multi-model" }
              ),
              {
                status: 429,
                headers: { "Retry-After": String(e.retryAfterSeconds) },
              }
            );
          }
        }
      }

      // Validate required fields
      if (!task || !input || !userTier || !userId) {
        recordError("ai/multi-model", "4xx_user");
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Missing required fields: task, input, userTier, userId",
            },
            { path: "ai/multi-model", note: "validation" }
          ),
          { status: 400 }
        );
      }

      // Validate task type
      const validTasks = [
        "text-generation",
        "text-classification",
        "summarization",
        "question-answering",
        "sentiment-analysis",
      ];
      if (!validTasks.includes(task)) {
        recordError("ai/multi-model", "4xx_user");
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: `Invalid task type. Must be one of: ${validTasks.join(", ")}`,
            },
            { path: "ai/multi-model", note: "validation" }
          ),
          { status: 400 }
        );
      }

      // Create multi-model request
      const multiModelRequest: MultiModelRequest = {
        task,
        input,
        options,
        userTier,
        userId,
      };

      // Process request through multi-model orchestrator
      const result =
        await multiModelOrchestrator.processRequest(multiModelRequest);

      // Return response
      const resp = NextResponse.json(
        enforceProvenance(
          { ...result, provenance: "live" },
          { path: "ai/multi-model" }
        )
      );
      recordRouteLatency("ai/multi-model", Date.now() - start);
      return resp;
    } catch (error) {
      console.error("[Multi-Model API] Error:", error);
      recordError("ai/multi-model", "5xx_server");
      recordFallback("backend_error");
      recordRouteLatency("ai/multi-model", Date.now() - start);
      return NextResponse.json(
        enforceProvenance(
          {
            success: false,
            error: "Internal server error during multi-model processing",
            provenance: "synthetic",
          },
          { path: "ai/multi-model" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "ai/multi-model" }
);

export const GET = withProvenance(
  async function GET() {
    const start = Date.now();
    try {
      // Get performance analytics
      const analytics = multiModelOrchestrator.getPerformanceAnalytics();

      const resp = NextResponse.json(
        enforceProvenance(
          {
            success: true,
            data: {
              analytics,
              timestamp: new Date().toISOString(),
              status: "operational",
            },
            provenance: "live",
          },
          { path: "ai/multi-model" }
        )
      );
      recordRouteLatency("ai/multi-model", Date.now() - start);
      return resp;
    } catch (error) {
      console.error("[Multi-Model API] Analytics error:", error);
      recordRouteLatency("ai/multi-model", Date.now() - start);
      return NextResponse.json(
        enforceProvenance(
          {
            success: false,
            error: "Failed to retrieve performance analytics",
            provenance: "synthetic",
          },
          { path: "ai/multi-model" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "ai/multi-model" }
);
