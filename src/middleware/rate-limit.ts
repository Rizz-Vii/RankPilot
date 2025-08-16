import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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

    // Check if rate limit exceeded
    if (userData.count > limit) {
      console.warn(`Rate limit exceeded for user ${userId}`);
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

    // Add rate limit headers
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

    return response;
  } catch (error) {
    console.error("Rate limiting error:", error);
    // Allow request through on error
    return NextResponse.next();
  }
}

// Configure middleware to run only on API routes
export const config = {
  matcher: "/api/:path*",
};
