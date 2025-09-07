import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import {
  TeamRateLimitError,
  applyTeamRateLimit,
} from "@/lib/rate-limit/team-rate-limit";
import { NextResponse } from "next/server";

// Proxy route to bypass client-side CORS issues when calling callable Cloud Function directly.
// Accepts SEO audit request JSON and forwards to Cloud Function endpoint.
// Includes optional Firebase ID token (Authorization header) for auth preservation.

// runSeoAudit is currently deployed in us-central1; default accordingly while allowing env override
const REGION =
  process.env.FIREBASE_REGION ||
  process.env.NEXT_PUBLIC_FUNCTIONS_REGION ||
  "us-central1";
const PROJECT =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rankpilot-h3jpc";
const FUNCTION_NAME = "runSeoAudit";
const FUNCTION_URL = `https://${REGION}-${PROJECT}.cloudfunctions.net/${FUNCTION_NAME}`;

export const POST = withProvenance(
  async function (req: Request) {
    try {
      const body = await req.json();

      // Basic validation
      if (!body || typeof body.url !== "string") {
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Invalid request: url required",
              provenance: "synthetic",
            },
            { path: "seo-audit/run", note: "validation" }
          ),
          { status: 400 }
        );
      }

      // TEAM-01: Apply team rate limit if teamId provided (lightweight - before upstream call)
      if (
        body &&
        typeof body === "object" &&
        "teamId" in body &&
        typeof (body as Record<string, unknown>).teamId === "string"
      ) {
        const teamId = (body as Record<string, unknown>).teamId as string;
        try {
          const res = await applyTeamRateLimit(teamId);
          if (res && res.allowed) {
            (
              req as unknown as { _teamRateHeaders?: Record<string, string> }
            )._teamRateHeaders = {
              ...res.headers,
              "X-RateLimit-Policy": "bucket",
            };
          } else if (res && !res.allowed) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "rate_limited",
                  retryAfter: res.retryAfterSeconds,
                  provenance: "synthetic",
                },
                { path: "seo-audit/run", note: "rate_limit" }
              ),
              {
                status: 429,
                headers: { ...res.headers, "X-RateLimit-Policy": "bucket" },
              }
            );
          }
        } catch (e) {
          if (e instanceof TeamRateLimitError) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "rate_limited",
                  retryAfter: e.retryAfterSeconds,
                  provenance: "synthetic",
                },
                { path: "seo-audit/run", note: "rate_limit" }
              ),
              {
                status: 429,
                headers: {
                  "Retry-After": String(e.retryAfterSeconds),
                  "X-RateLimit-Policy": "bucket",
                },
              }
            );
          }
        }
      }
      // Forward request in callable format ({data: {...}})
      const token = req.headers.get("authorization");
      const cfResp = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({ data: body }),
      });

      if (!cfResp.ok) {
        const text = await cfResp.text();
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Function call failed",
              details: text,
              provenance: "synthetic",
            },
            { path: "seo-audit/run", note: "upstream" }
          ),
          { status: cfResp.status }
        );
      }

      // Callable functions wrap response JSON in {result: ...} or raw; parse generically
      const json = await cfResp.json();
      const data = json?.result || json;
      const base = NextResponse.json(
        enforceProvenance(
          { success: true, data, provenance: "live" },
          { path: "seo-audit/run" }
        ),
        { status: 200 }
      );
      const rateHeaders = (
        req as unknown as { _teamRateHeaders?: Record<string, string> }
      )._teamRateHeaders;
      if (rateHeaders) {
        for (const [name, value] of Object.entries(rateHeaders)) {
          base.headers.set(name, value as string);
        }
      }
      return base;
    } catch (e: unknown) {
      const msg = ((): string => {
        if (e && typeof e === "object" && "message" in e) {
          const m = (e as Record<string, unknown>).message;
          if (typeof m === "string") return m;
        }
        return "Proxy error";
      })();
      return NextResponse.json(
        enforceProvenance(
          { success: false, error: msg, provenance: "synthetic" },
          { path: "seo-audit/run", note: "exception" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "seo-audit/run" }
);
