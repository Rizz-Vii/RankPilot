import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { rateLimit } from "./middleware/rate-limit";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "";
  const isApi = pathname.startsWith("/api/");
  const isStaticHtml = pathname.endsWith(".html");
  // Detect Next.js RSC/Flight requests (used for streaming server components/prefetch)
  // These requests expect a special streamed response; avoid mutating headers/body.
  const accept = request.headers.get("accept") || "";
  const isRSC =
    accept.includes("text/x-component") ||
    accept.includes("application/x-component") ||
    request.headers.has("RSC") ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("x-middleware-prefetch") === "1";
  // For API routes, run rate limiter first and short-circuit on 429
  if (isApi) {
    const rl = await rateLimit(request);
    if (rl.status === 429) {
      return rl;
    }
    // For API success path, propagate any rate-limit headers and return early without CSP
    return rl;
  }

  // For RSC/Flight fetches (not API), do not attach CSP or mutate streaming responses
  if (isRSC) {
    // Do not mutate headers/body for RSC/Flight streams; let Next.js control streaming semantics.
    // Some hop-by-hop headers (e.g., Connection/Keep-Alive) are illegal on HTTP/2 and can break streams.
    return NextResponse.next();
  }

  // Skip CSP/header injection for static HTML files served from /public (they may contain inline scripts without nonce)
  if (isStaticHtml) {
    return NextResponse.next();
  }

  // Non-API: proceed with security headers response, attach a CSP nonce to request headers for server components
  const requestHeaders = new Headers(request.headers);
  // Use a simple UUID as nonce token; pass via Next.js-recognized header so inline scripts get nonce attributes
  const nonce = crypto.randomUUID();
  // Next will attach this nonce to inline scripts it generates
  requestHeaders.set("x-nextjs-csp-nonce", nonce);
  // Also set the generic header keys Next.js recognizes to auto-apply nonce to its runtime and <Script> tags
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-nextjs-nonce", nonce);
  // Back-compat for any code reading the older custom header
  requestHeaders.set("x-rp-csp-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Add security headers - Enhanced with complete domain coverage
  const cspHeader = [
    // Default directives
    "default-src 'self'",
    // Scripts - Allow our nonce for inline; disallow generic 'unsafe-inline' in production
    // Use strict-dynamic so that nonced seed scripts can load others; keep explicit hosts for older browsers
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ` +
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
    // Some Next.js App Router streaming responses wrap necessary code in inline <script> tags that do not carry a nonce.
    // Allow inline script elements (but not attributes) while we await upstream nonce propagation.
    // Duplicate host allowlist here for older browsers that honor script-src-elem distinctly.
    "script-src-elem 'self' 'unsafe-inline' " +
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
    // Forbid inline event handlers/JS URLs
    "script-src-attr 'none'",
    // Styles: allow inline for Tailwind/critical styles; permit style attributes to avoid widespread violations in React/Next UIs
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
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
      // Allow Google reCAPTCHA network calls for App Check (e.g., api2/clr) – these hit google.com directly
      "https://www.google.com " +
      "https://www.recaptcha.net " +
      "https://*.gstatic.com " +
      "https://www.google-analytics.com " +
      "https://*.sentry.io " +
      "https://api.stripe.com " +
      "https://m.stripe.com " +
      "https://*.paypal.com " +
      "https://www.paypal.com " +
      "https://*.cloudfunctions.net " +
      // Allow Firestore WebSocket streams (prod)
      "wss://*.googleapis.com wss://firestore.googleapis.com " +
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
  // Only attach CSP on full HTML document requests
  const isHtmlDoc =
    (request.headers.get("sec-fetch-dest") || "").toLowerCase() ===
      "document" || accept.includes("text/html");
  const securityHeaders = {
    // Content Security Policy (apply only in production to avoid breaking Next dev runtime)
    ...(process.env.NODE_ENV === "production" && isHtmlDoc
      ? { "Content-Security-Policy": cspHeader }
      : {}),

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Clickjacking protection: enforce in production; relax in dev so VS Code webviews/Simple Browser can embed localhost
    ...(process.env.NODE_ENV === "production"
      ? { "X-Frame-Options": "SAMEORIGIN" }
      : {}),

    // XSS Protection
    "X-XSS-Protection": "1; mode=block",

    // Referrer Policy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions Policy (central definition – keep in sync with any security modules). We explicitly disable interest-cohort (FLoC).
    // Microphone optionally disabled via RP_DISABLE_MIC. Camera & geolocation always blocked. Payment directive set to () to avoid noisy console violations.
    "Permissions-Policy": (() => {
      const mic =
        process.env.RP_DISABLE_MIC === "1"
          ? "microphone=()"
          : "microphone=(self)";
      const base = `camera=(), ${mic}, geolocation=(), interest-cohort=()`;
      // Explicitly disable payment to silence violation warnings across environments
      return `${base}, payment=()`;
    })(),

    // HSTS
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",

    // Cross-domain policies for Adobe products etc. – disallow
    "X-Permitted-Cross-Domain-Policies": "none",

    // Hint DNS prefetch
    "X-DNS-Prefetch-Control": "on",
    // Cross-Origin Isolation (apply only to HTML docs in production; avoid breaking embeddings/payments)
  };

  // Apply headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // For full HTML docs, instruct caches and proxies to avoid storing or transforming streamed content
  if (isHtmlDoc) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0, must-revalidate"
    );
    response.headers.set("Surrogate-Control", "no-store");
    // no-transform reduces risk of intermediary altering chunked/RSC streams
    const vary = response.headers.get("Vary");
    response.headers.set("Vary", vary ? `${vary}, Accept` : "Accept");
    response.headers.set("Pragma", "no-cache");
  }

  // Expose the nonce on response headers as well to aid any consumers that read it from the response
  response.headers.set("x-nextjs-csp-nonce", nonce);
  response.headers.set("x-nextjs-nonce", nonce);
  response.headers.set("x-nonce", nonce);

  // Apply COOP/COEP only to full HTML documents in production to enable better performance APIs
  if (process.env.NODE_ENV === "production" && isHtmlDoc) {
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Resource-Policy", "same-site");
    // COEP is intentionally omitted to avoid breaking third-party iframes; add when all deps are compatible
  }

  // Avoid adding hop-by-hop headers that may break HTTP/2 or streaming semantics.

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
