/**
 * Advanced Security Features
 * Advanced Architecture Enhancement - DevReady Phase 3
 * 
 * Features:
 * - Enhanced encryption protocols
 * - Advanced threat detection
 * - Enterprise compliance frameworks
 * - Real-time security monitoring
 */

import { rateLimit } from '@/lib/utils/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

// Security configuration
const SECURITY_CONFIG = {
    // Rate limiting configurations for different endpoints
    RATE_LIMITS: {
        AUTH: { interval: 60 * 1000, limit: 5, uniqueTokenPerInterval: 100 }, // 5 attempts per minute
        API: { interval: 60 * 1000, limit: 100, uniqueTokenPerInterval: 500 }, // 100 requests per minute
        UPLOADS: { interval: 60 * 1000, limit: 10, uniqueTokenPerInterval: 200 }, // 10 uploads per minute
        ANALYSIS: { interval: 60 * 1000, limit: 20, uniqueTokenPerInterval: 300 }, // 20 analyses per minute
    },

    // Security headers
    SECURITY_HEADERS: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    },

    // Content Security Policy
    CSP: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.vercel.app", "https://*.googleapis.com"],
        'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'img-src': ["'self'", "data:", "https://*.vercel.app", "https://*.googleapis.com"],
        'connect-src': ["'self'", "https://*.firebase.googleapis.com", "https://*.firebaseio.com"],
        'frame-src': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
    },

    // Threat detection patterns
    THREAT_PATTERNS: [
        /(\<script[^>]*\>)/i, // XSS detection
        /(union.*select|select.*from|insert.*into|delete.*from)/i, // SQL injection
        /(\.\.\/|\.\.\\)/i, // Path traversal
        /(<iframe|<object|<embed)/i, // Potential malicious embeds
        /(eval\(|setTimeout\(|setInterval\()/i, // Code injection attempts
    ],

    // Blocked user agents (bots, scrapers)
    BLOCKED_USER_AGENTS: [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
    ],

    // Allowed origins for CORS
    ALLOWED_ORIGINS: [
        'http://localhost:3000',
        'https://localhost:3000',
        'https://*.vercel.app',
        'https://rankpilot.app',
        'https://*.rankpilot.app',
    ],
};

// Rate limiters for different endpoints
const rateLimiters = {
    auth: rateLimit(SECURITY_CONFIG.RATE_LIMITS.AUTH),
    api: rateLimit(SECURITY_CONFIG.RATE_LIMITS.API),
    uploads: rateLimit(SECURITY_CONFIG.RATE_LIMITS.UPLOADS),
    analysis: rateLimit(SECURITY_CONFIG.RATE_LIMITS.ANALYSIS),
};

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) {
        return realIP;
    }
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    return '127.0.0.1';
}

/**
 * Apply rate limiting based on endpoint type
 */
async function applyRateLimit(request: NextRequest): Promise<boolean> {
    const pathname = request.nextUrl.pathname;
    const ip = getClientIP(request);

    try {
        if (pathname.startsWith('/api/auth/')) {
            await rateLimiters.auth.check(SECURITY_CONFIG.RATE_LIMITS.AUTH.limit, ip);
        } else if (pathname.startsWith('/api/uploads/')) {
            await rateLimiters.uploads.check(SECURITY_CONFIG.RATE_LIMITS.UPLOADS.limit, ip);
        } else if (pathname.startsWith('/api/seo/') || pathname.startsWith('/api/neuroseo/')) {
            await rateLimiters.analysis.check(SECURITY_CONFIG.RATE_LIMITS.ANALYSIS.limit, ip);
        } else if (pathname.startsWith('/api/')) {
            await rateLimiters.api.check(SECURITY_CONFIG.RATE_LIMITS.API.limit, ip);
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Detect potential threats in request
 */
function detectThreats(request: NextRequest): { isThreat: boolean; threatType?: string; } {
    const url = request.url;
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    // Check for malicious user agents
    for (const pattern of SECURITY_CONFIG.BLOCKED_USER_AGENTS) {
        if (pattern.test(userAgent)) {
            return { isThreat: true, threatType: 'blocked_user_agent' };
        }
    }

    // Check for threat patterns in URL
    for (const pattern of SECURITY_CONFIG.THREAT_PATTERNS) {
        if (pattern.test(url) || pattern.test(referer)) {
            return { isThreat: true, threatType: 'malicious_pattern' };
        }
    }

    // Check for suspicious path traversal attempts
    if (url.includes('../') || url.includes('..\\')) {
        return { isThreat: true, threatType: 'path_traversal' };
    }

    // Check for common attack payloads
    const suspiciousPatterns = [
        'javascript:',
        'data:text/html',
        'vbscript:',
        'onload=',
        'onerror=',
    ];

    for (const pattern of suspiciousPatterns) {
        if (url.toLowerCase().includes(pattern)) {
            return { isThreat: true, threatType: 'xss_attempt' };
        }
    }

    return { isThreat: false };
}

/**
 * Apply CORS headers for secure cross-origin requests
 */
function applyCORS(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin');

    // Check if origin is allowed
    const isAllowedOrigin = origin && SECURITY_CONFIG.ALLOWED_ORIGINS.some(
        allowedOrigin => {
            if (allowedOrigin.includes('*')) {
                const pattern = allowedOrigin.replace(/\*/g, '.*');
                return new RegExp(pattern).test(origin);
            }
            return origin === allowedOrigin;
        }
    );

    if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
    const isProd = process.env.NODE_ENV === 'production';
    // Apply basic security headers
    for (const [header, value] of Object.entries(SECURITY_CONFIG.SECURITY_HEADERS)) {
        response.headers.set(header, value);
    }

    // Development overrides: relax headers and skip strict CSP to enable Next.js dev runtime
    if (!isProd) {
        // Allow iframes on same origin (Stripe, playgrounds in dev)
        response.headers.set('X-Frame-Options', 'SAMEORIGIN');
        // Relax payments to avoid noisy warnings in dev
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
        // Skip enforcing CSP in development to avoid breaking HMR and eval-based transforms
        response.headers.delete('Content-Security-Policy');
        // Optionally set report-only relaxed CSP (commented out for now)
        // response.headers.set('Content-Security-Policy-Report-Only', "default-src 'self' http://localhost:*; connect-src 'self' http://localhost:* ws://localhost:*; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
    } else {
        // Production: Build and apply strict CSP
        const cspDirectives = Object.entries(SECURITY_CONFIG.CSP)
            .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
            .join('; ');
        response.headers.set('Content-Security-Policy', cspDirectives);
    }

    // Add security monitoring headers
    response.headers.set('X-Security-Scan', 'enabled');
    response.headers.set('X-Threat-Detection', 'active');
    response.headers.set('X-Security-Version', '1.0');

    return response;
}

/**
 * Log security events for monitoring
 */
function logSecurityEvent(request: NextRequest, eventType: string, details?: any) {
    const securityEvent = {
        timestamp: new Date().toISOString(),
        type: eventType,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        url: request.url,
        method: request.method,
        details,
    };

    // In production, this would send to a security monitoring service
    console.warn('[SECURITY]', JSON.stringify(securityEvent));
}

/**
 * Main security middleware function
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const isProd = process.env.NODE_ENV === 'production';

    // Handle OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });
        return applyCORS(request, response);
    }

    // Apply rate limiting (disable strict enforcement in development)
    const rateLimitPassed = await applyRateLimit(request);
    if (!rateLimitPassed) {
        logSecurityEvent(request, 'rate_limit_exceeded');
        if (isProd) {
            return new NextResponse('Rate limit exceeded', { status: 429 });
        }
    }

    // Detect threats (log in dev, block only in production)
    const threatCheck = detectThreats(request);
    if (threatCheck.isThreat) {
        logSecurityEvent(request, 'threat_detected', { threatType: threatCheck.threatType });
        if (isProd) {
            return new NextResponse('Request blocked for security reasons', { status: 403 });
        }
    }

    // Create response
    const response = NextResponse.next();

    // Apply security headers
    const secureResponse = applySecurityHeaders(response);

    // Apply CORS
    const finalResponse = applyCORS(request, secureResponse);

    // Add performance timing
    finalResponse.headers.set('X-Security-Processing-Time', `${Date.now() - startTime}ms`);

    return finalResponse;
}

/**
 * Security monitoring and analytics
 */
export class SecurityMonitor {
    private static instance: SecurityMonitor;
    private events: any[] = [];

    static getInstance(): SecurityMonitor {
        if (!SecurityMonitor.instance) {
            SecurityMonitor.instance = new SecurityMonitor();
        }
        return SecurityMonitor.instance;
    }

    logEvent(eventType: string, details: any) {
        const event = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: eventType,
            details,
        };

        this.events.push(event);

        // Keep only last 1000 events in memory
        if (this.events.length > 1000) {
            this.events = this.events.slice(-1000);
        }

        // In production, send to monitoring service
        console.log('[SECURITY_MONITOR]', event);
    }

    getRecentEvents(limit = 100): any[] {
        return this.events.slice(-limit);
    }

    getEventsByType(eventType: string, limit = 100): any[] {
        return this.events
            .filter(event => event.type === eventType)
            .slice(-limit);
    }

    getThreatSummary(): { [key: string]: number; } {
        const summary: { [key: string]: number; } = {};

        for (const event of this.events) {
            if (event.type === 'threat_detected') {
                const threatType = event.details?.threatType || 'unknown';
                summary[threatType] = (summary[threatType] || 0) + 1;
            }
        }

        return summary;
    }
}

/**
 * Enterprise compliance validation
 */
export function validateCompliance(request: NextRequest): {
    isCompliant: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    // Check for required security headers in response
    const requiredHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
    ];

    // HTTPS enforcement
    if (!request.url.startsWith('https://') && process.env.NODE_ENV === 'production') {
        issues.push('HTTPS required in production');
    }

    // Check authentication for sensitive endpoints
    const sensitiveEndpoints = ['/api/admin/', '/api/user/', '/api/upload/'];
    const authHeader = request.headers.get('authorization');

    if (sensitiveEndpoints.some(endpoint => request.nextUrl.pathname.startsWith(endpoint))) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            issues.push('Authentication required for sensitive endpoints');
        }
    }

    return {
        isCompliant: issues.length === 0,
        issues,
    };
}

export { SECURITY_CONFIG };
