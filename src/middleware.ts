import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Get response
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

    // Permissions Policy (relax payment in local dev to avoid Stripe console noise)
    "Permissions-Policy": isLocal
      ? "camera=(), microphone=(), geolocation=(), payment=(self)"
      : "camera=(), microphone=(), geolocation=(), payment=()",

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
    // Apply to all paths except API routes and static files
    "/((?!api/|_next/|static/|public/|favicon.ico).*)",
  ],
};
