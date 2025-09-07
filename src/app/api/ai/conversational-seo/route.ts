/**
 * Conversational SEO AI API Route
 * Implements Priority 1 Conversational AI Enhancement from DevReady Phase 3
 */

import { conversationalSEOEngine } from "@/lib/ai/conversational-seo-engine";
import { extractErrorMessage } from "@/lib/errors/extract-error-message";
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
      const body = await request.json();
      const { action, sessionId, message, userId, userTier, teamId } = body;
      if (typeof teamId === "string" && teamId) {
        try {
          await enforceTeamRateLimit(adminDb, teamId, {
            routeKey: "ai/conversational-seo",
          });
        } catch (e: unknown) {
          if (e instanceof TeamRateLimitError) {
            recordRateLimitRejection("ai/conversational-seo");
            recordRateLimitRejection(`team:${teamId}`);
            recordRouteLatency("ai/conversational-seo", Date.now() - start);
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "rate_limited",
                  retryAfter: e.retryAfterSeconds,
                  provenance: "synthetic",
                },
                { path: "ai/conversational-seo" }
              ),
              {
                status: 429,
                headers: { "Retry-After": String(e.retryAfterSeconds) },
              }
            );
          }
        }
      }

      switch (action) {
        case "start":
          if (!userId || !userTier) {
            recordError("ai/conversational-seo", "4xx_user");
            recordRouteLatency("ai/conversational-seo", Date.now() - start);
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Missing required fields: userId, userTier",
                  provenance: "synthetic",
                },
                { path: "ai/conversational-seo", note: "validation" }
              ),
              { status: 400 }
            );
          }

          const newSessionId = await conversationalSEOEngine.startConversation(
            userId,
            userTier
          );
          const startResp = NextResponse.json(
            enforceProvenance(
              {
                success: true,
                data: {
                  sessionId: newSessionId,
                  message: "Conversation started successfully",
                },
                provenance: "live",
              },
              { path: "ai/conversational-seo", note: "start" }
            )
          );
          recordRouteLatency("ai/conversational-seo", Date.now() - start);
          return startResp;

        case "message":
          if (!sessionId || !message) {
            recordError("ai/conversational-seo", "4xx_user");
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Missing required fields: sessionId, message",
                  provenance: "synthetic",
                },
                { path: "ai/conversational-seo", note: "validation" }
              ),
              { status: 400 }
            );
          }

          const response = await conversationalSEOEngine.processMessage(
            sessionId,
            message
          );

          const resp = NextResponse.json(
            enforceProvenance(
              {
                success: true,
                data: response,
                provenance: "live",
              },
              { path: "ai/conversational-seo" }
            )
          );
          recordRouteLatency("ai/conversational-seo", Date.now() - start);
          return resp;

        default:
          recordError("ai/conversational-seo", "4xx_user");
          recordRouteLatency("ai/conversational-seo", Date.now() - start);
          return NextResponse.json(
            enforceProvenance(
              {
                success: false,
                error: "Invalid action. Supported actions: start, message",
                provenance: "synthetic",
              },
              { path: "ai/conversational-seo", note: "invalid_action" }
            ),
            { status: 400 }
          );
      }
    } catch (error) {
      console.error("[Conversational SEO API] Error:", error);
      recordError("ai/conversational-seo", "5xx_server");
      recordFallback("backend_error");
      recordRouteLatency("ai/conversational-seo", Date.now() - start);
      return NextResponse.json(
        enforceProvenance(
          {
            success: false,
            error: extractErrorMessage(error) || "Internal server error",
            provenance: "synthetic",
          },
          { path: "ai/conversational-seo", note: "exception" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "ai/conversational-seo" }
);

export async function GET() {
  const start = Date.now();
  const resp = NextResponse.json(
    enforceProvenance(
      {
        success: true,
        data: {
          status: "operational",
          features: [
            "Chat-based SEO analysis",
            "Multi-turn dialogue",
            "Personalized recommendations",
            "Knowledge base integration",
            "Context-aware conversations",
          ],
          supportedTiers: ["free", "starter", "agency", "enterprise", "admin"],
        },
        provenance: "live",
      },
      { path: "ai/conversational-seo" }
    )
  );
  recordRouteLatency("ai/conversational-seo", Date.now() - start);
  return resp;
}
