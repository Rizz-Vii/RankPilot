import { getLogger } from '@/lib/logging/app-logger';
import { recordRateLimitRejection, recordTeamRateLimitAllowed } from '@/lib/metrics/unified-metrics';
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// Avoid importing Node-only admin SDK on Edge runtime. We'll dynamically import
// the team rate limiter only when not running in Edge.
type ApplyTeamRateLimit = (teamId?: string) => Promise<{ allowed: boolean; headers: Record<string, string> } | null>;
let _applyTeamRateLimit: ApplyTeamRateLimit | null = null;

// Store request counts in memory (in production, use Redis or similar)
const requestCounts = new Map<string, { count: number; timestamp: number }>();

// Configure rate limits
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute
// Allow overrides for local CI stress via env; default to generous in dev when RATE_LIMIT_DEV_RELAX=1
const DEV_RELAX = process.env.RATE_LIMIT_DEV_RELAX === '1' && process.env.NODE_ENV !== 'production';
const MAX_REQUESTS = DEV_RELAX ? 1000 : 100; // Maximum requests per minute
const API_MAX_REQUESTS = DEV_RELAX ? 600 : 50; // Lower limit for API endpoints

export async function rateLimit(req: NextRequest) {
  try {
    const logger = getLogger('middleware.rate-limit');
    // Get token to identify user
    const token = await getToken({ req });
    const userId =
      token?.sub ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    // Check if request is to API endpoint
    const isApiRequest = req.nextUrl.pathname.startsWith("/api/");
    const limit = isApiRequest ? API_MAX_REQUESTS : MAX_REQUESTS;

    const now = Date.now();
    const windowStart = now - WINDOW_SIZE_MS;

    // Clean up old entries
    for (const [key, data] of requestCounts.entries()) {
      if (data.timestamp < windowStart) {
        requestCounts.delete(key);
      }
    }

    // Get or create user's request count
    const userData = requestCounts.get(userId) || { count: 0, timestamp: now };

    // Reset count if outside window
    if (userData.timestamp < windowStart) {
      userData.count = 0;
      userData.timestamp = now;
    }

    // Increment count
    userData.count++;
    requestCounts.set(userId, userData);

    // Check if per-user rate limit exceeded
    if (userData.count > limit) {
      logger.warn('user.rate.limit.exceeded', { userId, path: req.nextUrl.pathname });
      recordRateLimitRejection('user');
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil(
            (userData.timestamp + WINDOW_SIZE_MS - now) / 1000
          ),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(
              (userData.timestamp + WINDOW_SIZE_MS - now) / 1000
            ).toString(),
          },
        }
      );
    }

    // Team-scoped token bucket (optional via flag + header)
    const teamId = req.headers.get('x-team-id') || undefined;
    let teamResult: { allowed: boolean; headers: Record<string, string> } | null = null;
    try {
      if (process.env.NEXT_RUNTIME !== 'edge' && teamId) {
        if (!_applyTeamRateLimit) {
          const mod = await import('@/lib/rate-limit/team-rate-limit');
          _applyTeamRateLimit = mod.applyTeamRateLimit as ApplyTeamRateLimit;
        }
        teamResult = await _applyTeamRateLimit?.(teamId) ?? null;
      }
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : String(e);
      logger.warn('team.rate.limit.unavailable', { error: msg });
    }
    if (teamResult && !teamResult.allowed) {
      recordRateLimitRejection(teamId || 'team');
      return new NextResponse(
        JSON.stringify({ error: 'Team rate limit exceeded' }),
        { status: 429, headers: teamResult.headers }
      );
    }

    // Success path: add user + (if present) team headers
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      (limit - userData.count).toString()
    );
    response.headers.set(
      "X-RateLimit-Reset",
      Math.ceil((userData.timestamp + WINDOW_SIZE_MS) / 1000).toString()
    );
    if (teamResult && teamResult.allowed) {
      Object.entries(teamResult.headers).forEach(([k, v]) => response.headers.set(k, v));
      if (teamId) recordTeamRateLimitAllowed(teamId);
    }
    return response;
  } catch (error) {
    const logger = getLogger('middleware.rate-limit');
    const msg = error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : String(error);
    logger.error('rate.limit.error', { error: msg });
    // Allow request through on error
    return NextResponse.next();
  }
}

// Configure middleware to run only on API routes
export const config = {
  matcher: "/api/:path*",
};
