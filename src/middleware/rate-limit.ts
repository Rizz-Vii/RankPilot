import { getLogger } from '@/lib/logging/app-logger';
import { recordRateLimitRejection, recordTeamRateLimitAllowed } from '@/lib/metrics/unified-metrics';
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// Avoid importing Node-only admin SDK on Edge runtime. We'll dynamically import
// the team rate limiter only when not running in Edge.
type ApplyTeamRateLimit = (teamId?: string) => Promise<{ allowed: boolean; headers: Record<string, string> } | null>;
let _applyTeamRateLimit: ApplyTeamRateLimit | null = null;

// Store request counts in memory (fallback)
const requestCounts = new Map<string, { count: number; timestamp: number }>();

// Optional durable store via Upstash Redis (if configured)
// Minimal durable counter using Upstash Redis REST API (Edge-safe, no deps)
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
async function upstashIncr(key: string, expireSeconds: number): Promise<number | null> {
  if (!upstashUrl || !upstashToken) return null;
  try {
    const incrRes = await fetch(`${upstashUrl}/incr/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${upstashToken}` },
      // Ensure no caching by intermediaries
      cache: 'no-store',
    });
    if (!incrRes.ok) return null;
    const data = (await incrRes.json()) as { result?: number };
    const count = typeof data.result === 'number' ? data.result : NaN;
    if (!Number.isFinite(count)) return null;
    // Set expiry only on first increment to avoid resetting TTL each call
    if (count === 1 && expireSeconds > 0) {
      // best-effort; ignore failure
      fetch(`${upstashUrl}/expire/${encodeURIComponent(key)}/${expireSeconds}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: 'no-store',
      }).catch(() => { });
    }
    return count;
  } catch {
    return null;
  }
}

// Configure rate limits (env-driven with safe production fallbacks)
const DURABLE_ENABLED = Boolean(upstashUrl && upstashToken);
const DEV_RELAX = process.env.RATE_LIMIT_DEV_RELAX === '1' && process.env.NODE_ENV !== 'production';
const RL_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
// In production without a durable store, apply stricter emergency caps unless explicitly overridden
const DEFAULT_WEB_CAP = DEV_RELAX ? 1000 : (!DURABLE_ENABLED && process.env.NODE_ENV === 'production' ? 30 : 100);
const DEFAULT_API_CAP = DEV_RELAX ? 600 : (!DURABLE_ENABLED && process.env.NODE_ENV === 'production' ? 15 : 50);
const RL_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || DEFAULT_WEB_CAP);
const RL_API_MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX || DEFAULT_API_CAP);

// One-time health log in production to reveal limiter mode
try {
  const g = globalThis as unknown as { __RP_RL_HEALTH_LOGGED__?: boolean };
  if (process.env.NODE_ENV === 'production' && !g.__RP_RL_HEALTH_LOGGED__) {
    const logger = getLogger('middleware.rate-limit');
    logger.info('rate.limit.health', {
      runtime: process.env.NEXT_RUNTIME || 'node',
      durable: DURABLE_ENABLED,
      windowMs: RL_WINDOW_MS,
      limits: { web: RL_MAX_REQUESTS, api: RL_API_MAX_REQUESTS }
    });
    if (!DURABLE_ENABLED) {
      logger.warn('rate.limit.durable_store_missing', { note: 'Using in-memory per-instance limiter', emergencyCaps: { web: RL_MAX_REQUESTS, api: RL_API_MAX_REQUESTS } });
    }
    g.__RP_RL_HEALTH_LOGGED__ = true;
  }
} catch { /* noop */ }

export async function rateLimit(req: NextRequest) {
  try {
    // Ignore CORS preflight requests
    if (req.method === 'OPTIONS') {
      return NextResponse.next();
    }
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
    const limit = isApiRequest ? RL_API_MAX_REQUESTS : RL_MAX_REQUESTS;

    const now = Date.now();
    const windowStart = now - RL_WINDOW_MS;

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

    // Check if per-user rate limit exceeded (in-memory path) when no durable store configured
    if (!DURABLE_ENABLED && userData.count > limit) {
      logger.warn('user.rate.limit.exceeded', { userId, path: req.nextUrl.pathname });
      recordRateLimitRejection('user');
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil(
            (userData.timestamp + RL_WINDOW_MS - now) / 1000
          ),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Retry-After": Math.ceil(
              (userData.timestamp + RL_WINDOW_MS - now) / 1000
            ).toString(),
          },
        }
      );
    }

    // Durable limiter path using Upstash REST (if available): key per user per window
    if (DURABLE_ENABLED) {
      const key = `rl:${isApiRequest ? 'api' : 'web'}:${userId}`;
      try {
        const count = await upstashIncr(key, Math.ceil(RL_WINDOW_MS / 1000));
        if (count !== null && count > limit) {
          logger.warn('user.rate.limit.exceeded', { userId, path: req.nextUrl.pathname, durable: true });
          recordRateLimitRejection('user');
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests' }),
            { status: 429, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '60' } }
          );
        }
      } catch {
        // Fallback silently to in-memory if durable path fails
        logger.degraded?.('rate.limit.redis_failed');
      }
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
        { status: 429, headers: { ...teamResult.headers, 'Cache-Control': 'no-store' } }
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
      Math.ceil((userData.timestamp + RL_WINDOW_MS) / 1000).toString()
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
    const res = NextResponse.next();
    // Ensure intermediaries don't cache error states
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

// Configure middleware to run only on API routes
export const config = {
  matcher: "/api/:path*",
};
