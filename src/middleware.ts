import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { rateLimit } from "./middleware/rate-limit";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { rateLimit } from "./middleware/rate-limit";
import { quotaMiddleware, shouldEnforceQuota, extractTeamId } from "./lib/middleware/quota-guard";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "";
  const isApi = pathname.startsWith("/api/");
  
  // For API routes, run rate limiter first and short-circuit on 429
  if (isApi) {
    const rl = await rateLimit(request);
    if (rl.status === 429) {
      return rl;
    }
    
    // Check if this route needs quota enforcement
    const quotaCheck = shouldEnforceQuota(pathname);
    if (quotaCheck.enforce) {
      const teamId = extractTeamId(request);
      
      if (teamId && quotaCheck.quotaType) {
        // Apply quota enforcement
        const quotaResult = await quotaMiddleware(request, {
          quotaType: quotaCheck.quotaType,
          teamId,
          // TODO: Extract plan from user context/headers
          // For now, use default plan - this should be enhanced based on actual user plan detection
        });
        
        if (quotaResult && quotaResult.status === 429) {
          return quotaResult;
        }
        
        // Merge quota headers with rate limit headers
        if (quotaResult) {
          const mergedHeaders = new Headers(rl.headers);
          quotaResult.headers.forEach((value, key) => {
            mergedHeaders.set(key, value);
          });
          return NextResponse.next({ headers: mergedHeaders });
        }
      }
    }
    
    // For API success path, propagate any rate-limit headers and return early without CSP
    return rl;
  }

  // Non-API: proceed with security headers response
  const response = NextResponse.next();

  const isLocal = process.env.NODE_ENV !== "production" || request.nextUrl.hostname === "localhost";

  // Add security headers - Enhanced with complete domain coverage
  const cspHeader = [
    // Default directives
    "default-src 'self'",
    // Scripts - Complete coverage for all third-party services
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
    "https://apis.google.com " +
    "https://*.firebaseapp.com " +
    "https://*.firebase.com " +
    "https://js.stripe.com " +
    "https://*.paypal.com " +
    "https://www.paypal.com " +
    "https://www.google.com " +
    "https://www.gstatic.com " +
    "https://www.googletagmanager.com " +
    "https://www.google-analytics.com",
    // Styles
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Images
    "img-src 'self' data: https:",
    // Connect (APIs, WebSocket) - Complete Firebase and third-party coverage
    "connect-src 'self' " +
    "https://*.firebaseapp.com " +
    "https://*.firebase.com " +
    "https://api.openai.com " +
    "https://identitytoolkit.googleapis.com " +
    "https://securetoken.googleapis.com " +
    "https://firestore.googleapis.com " +
    "https://firebase.googleapis.com " +
    "https://firebaseinstallations.googleapis.com " +
    "https://firebaseremoteconfig.googleapis.com " +
    "https://firebaseappcheck.googleapis.com " +
    "https://content-firebaseappdistribution.googleapis.com " +
    "https://*.googleapis.com " +
    "https://www.google-analytics.com " +
    "https://api.stripe.com " +
    "https://*.paypal.com " +
    "https://www.paypal.com " +
    "https://*.cloudfunctions.net " +
    (process.env.NODE_ENV !== "production"
      ? "http://localhost:* ws://localhost:*"
      : ""),
    // Media
    "media-src 'none'",
    // Object/Embed
    "object-src 'none'",
    // Frames (used by Firebase Auth pop-ups/redirects, Stripe, and PayPal)
    "frame-src 'self' " +
    "https://*.firebaseapp.com " +
    "https://*.firebase.com " +
    "https://accounts.google.com " +
    "https://js.stripe.com " +
    "https://*.stripe.com " +
    "https://hooks.stripe.com " +
    "https://*.paypal.com " +
    "https://www.google.com",
    // Worker
    "worker-src 'self' blob:",
  ].join("; ");
  const securityHeaders = {
    // Content Security Policy (apply only in production to avoid breaking Next dev runtime)
    ...(process.env.NODE_ENV === "production"
      ? { "Content-Security-Policy": cspHeader }
      : {}),

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Prevent clickjacking (align with Next headers)
    "X-Frame-Options": "SAMEORIGIN",

    // XSS Protection
    "X-XSS-Protection": "1; mode=block",

    // Referrer Policy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions Policy (central definition – keep in sync with any security modules). We explicitly disable interest-cohort (FLoC).
    // Microphone optionally disabled via RP_DISABLE_MIC. Camera & geolocation always blocked. Payment directive removed (default browser handling) to reduce console noise.
    "Permissions-Policy": (() => {
      const mic = process.env.RP_DISABLE_MIC === '1' ? 'microphone=()' : 'microphone=(self)';
      const base = `camera=(), ${mic}, geolocation=(), interest-cohort=()`;
      return base;
    })(),

    // HSTS
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };

  // Apply headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configure paths that need security headers
export const config = {
  matcher: [
    // Include API routes (rate limit only) and non-API app paths (security headers)
    "/api/:path*",
    "/((?!_next/|static/|public/|favicon.ico).*)",
  ],
};
