/**
 * Edge Computing Configuration
 * Advanced Architecture Enhancement - DevReady Phase 3
 * 
 * Features:
 * - Edge function definitions
 * - Global CDN optimization
 * - Performance distribution
 * - Intelligent caching strategies
 */

import { NextRequest, NextResponse } from 'next/server';

// Edge locations configuration
const EDGE_LOCATIONS = {
    US_EAST: 'us-east-1',
    US_WEST: 'us-west-2',
    EU_WEST: 'eu-west-1',
    ASIA_PACIFIC: 'ap-southeast-1',
    AUSTRALIA: 'ap-southeast-2'
};

// Performance optimization rules
interface CacheConfig {
    paths: string[];
    maxAge: number;
    staleWhileRevalidate?: number;
    immutable?: boolean;
}

const PERFORMANCE_RULES: Record<string, CacheConfig> = {
    // Static assets cache for 1 year
    STATIC_ASSETS: {
        paths: ['/images/', '/icons/', '/fonts/', '/css/', '/js/'],
        maxAge: 31536000, // 1 year
        immutable: true
    },

    // API responses cache for 5 minutes
    API_RESPONSES: {
        paths: ['/api/'],
        maxAge: 300, // 5 minutes
        staleWhileRevalidate: 60
    },

    // HTML pages cache for 1 hour with revalidation
    HTML_PAGES: {
        paths: ['/'],
        maxAge: 3600, // 1 hour
        staleWhileRevalidate: 300
    }
};

/**
 * Determine the best edge location based on request origin
 */
function getOptimalEdgeLocation(request: NextRequest): string {
    const countryCode = request.headers.get('cf-ipcountry') ||
        request.headers.get('x-country-code') || 'US';

    // Map countries to edge locations for optimal performance
    const locationMap: Record<string, string> = {
        'US': EDGE_LOCATIONS.US_EAST,
        'CA': EDGE_LOCATIONS.US_EAST,
        'MX': EDGE_LOCATIONS.US_WEST,
        'BR': EDGE_LOCATIONS.US_EAST,
        'GB': EDGE_LOCATIONS.EU_WEST,
        'DE': EDGE_LOCATIONS.EU_WEST,
        'FR': EDGE_LOCATIONS.EU_WEST,
        'NL': EDGE_LOCATIONS.EU_WEST,
        'ES': EDGE_LOCATIONS.EU_WEST,
        'IT': EDGE_LOCATIONS.EU_WEST,
        'JP': EDGE_LOCATIONS.ASIA_PACIFIC,
        'CN': EDGE_LOCATIONS.ASIA_PACIFIC,
        'KR': EDGE_LOCATIONS.ASIA_PACIFIC,
        'SG': EDGE_LOCATIONS.ASIA_PACIFIC,
        'AU': EDGE_LOCATIONS.AUSTRALIA,
        'NZ': EDGE_LOCATIONS.AUSTRALIA
    };

    return locationMap[countryCode] || EDGE_LOCATIONS.US_EAST;
}

/**
 * Apply intelligent caching headers based on request type
 */
function applyCachingStrategy(request: NextRequest, response: NextResponse): NextResponse {
    const pathname = request.nextUrl.pathname;

    // Determine caching strategy
    let cacheConfig: CacheConfig = PERFORMANCE_RULES.HTML_PAGES; // default

    for (const [ruleType, config] of Object.entries(PERFORMANCE_RULES)) {
        if (config.paths.some(path => pathname.startsWith(path))) {
            cacheConfig = config;
            break;
        }
    }

    // Build cache control header
    let cacheControl = `public, max-age=${cacheConfig.maxAge}`;

    if (cacheConfig.staleWhileRevalidate) {
        cacheControl += `, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`;
    }

    if (cacheConfig.immutable) {
        cacheControl += ', immutable';
    }

    // Apply cache headers
    response.headers.set('Cache-Control', cacheControl);

    // Add performance headers
    response.headers.set('X-Edge-Location', getOptimalEdgeLocation(request));
    response.headers.set('X-Cache-Strategy', Object.keys(PERFORMANCE_RULES).find(
        key => PERFORMANCE_RULES[key] === cacheConfig
    ) || 'DEFAULT');

    return response;
}

/**
 * Global performance optimization for static assets
 */
export function optimizeStaticAssets(request: NextRequest): NextResponse | null {
    const pathname = request.nextUrl.pathname;

    // Check if this is a static asset
    const isStaticAsset = PERFORMANCE_RULES.STATIC_ASSETS.paths.some(
        path => pathname.startsWith(path)
    );

    if (!isStaticAsset) {
        return null;
    }

    // Create optimized response for static assets
    const response = NextResponse.next();

    // Apply aggressive caching for static assets
    response.headers.set('Cache-Control',
        `public, max-age=${PERFORMANCE_RULES.STATIC_ASSETS.maxAge}, immutable`
    );

    // Add compression hints
    response.headers.set('Vary', 'Accept-Encoding');

    // Add edge location for monitoring
    response.headers.set('X-Edge-Location', getOptimalEdgeLocation(request));
    response.headers.set('X-Performance-Optimized', 'static-assets');

    return response;
}

/**
 * API response optimization with intelligent caching
 */
export function optimizeAPIResponses(request: NextRequest): NextResponse | null {
    const pathname = request.nextUrl.pathname;

    if (!pathname.startsWith('/api/')) {
        return null;
    }

    // Different caching strategies for different API endpoints
    interface APICacheConfig {
        maxAge: number;
        staleWhileRevalidate?: number;
    }

    const cacheStrategies: Record<string, APICacheConfig> = {
        '/api/seo/analysis': { maxAge: 300, staleWhileRevalidate: 60 }, // 5 min cache
        '/api/keywords': { maxAge: 600, staleWhileRevalidate: 120 }, // 10 min cache
        '/api/competitors': { maxAge: 1800, staleWhileRevalidate: 300 }, // 30 min cache
        '/api/user': { maxAge: 60, staleWhileRevalidate: 30 }, // 1 min cache
        '/api/auth': { maxAge: 0 }, // No cache for auth
    };

    const response = NextResponse.next();

    // Find matching cache strategy
    let cacheConfig: APICacheConfig = { maxAge: 300, staleWhileRevalidate: 60 }; // default

    for (const [endpoint, config] of Object.entries(cacheStrategies)) {
        if (pathname.startsWith(endpoint)) {
            cacheConfig = config;
            break;
        }
    }

    // Apply caching headers
    if (cacheConfig.maxAge > 0) {
        let cacheControl = `public, max-age=${cacheConfig.maxAge}`;
        if (cacheConfig.staleWhileRevalidate) {
            cacheControl += `, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`;
        }
        response.headers.set('Cache-Control', cacheControl);
    } else {
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    // Add API optimization headers
    response.headers.set('X-Edge-Location', getOptimalEdgeLocation(request));
    response.headers.set('X-API-Optimized', 'true');

    return response;
}

/**
 * Geographic performance optimization
 */
export function optimizeByGeography(request: NextRequest): NextResponse {
    const response = NextResponse.next();
    const edgeLocation = getOptimalEdgeLocation(request);

    // Add geographic optimization headers
    response.headers.set('X-Edge-Location', edgeLocation);
    response.headers.set('X-Geographic-Optimization', 'enabled');

    // Add region-specific performance hints
    const isAsia = edgeLocation === EDGE_LOCATIONS.ASIA_PACIFIC;
    const isAustralia = edgeLocation === EDGE_LOCATIONS.AUSTRALIA;

    if (isAsia || isAustralia) {
        // Optimize for higher latency regions
        response.headers.set('X-Preload-Critical', 'true');
        response.headers.set('X-Compression-Level', 'high');
    }

    return response;
}

/**
 * Performance monitoring and analytics
 */
export function addPerformanceMonitoring(request: NextRequest, response: NextResponse): NextResponse {
    const startTime = Date.now();

    // Add performance timing headers
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Edge-Processing', 'true');

    // Add monitoring headers for analysis
    response.headers.set('X-Request-ID', crypto.randomUUID());
    response.headers.set('X-Timestamp', new Date().toISOString());

    return response;
}

/**
 * Main edge computing middleware
 */
export function edgeMiddleware(request: NextRequest): NextResponse {
    const startTime = Date.now();

    // In development, avoid edge optimizations and disable caching to prevent stale/cached 404s
    if (process.env.NODE_ENV !== 'production') {
        const devResponse = NextResponse.next();
        devResponse.headers.set('Cache-Control', 'no-store, must-revalidate');
        devResponse.headers.set('X-Edge-Optimized', 'disabled-dev');
        devResponse.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
        return devResponse;
    }

    // Try optimizations in order of priority
    let response = optimizeStaticAssets(request) ||
        optimizeAPIResponses(request) ||
        optimizeByGeography(request) ||
        NextResponse.next(); // Fallback to default response

    // Apply performance monitoring
    response = addPerformanceMonitoring(request, response);

    // Apply intelligent caching
    response = applyCachingStrategy(request, response);

    // Add global performance headers
    response.headers.set('X-Edge-Optimized', 'true');
    response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);

    return response;
}

// Export edge configuration for Vercel/Netlify
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - sw.js (service worker)
         */
        '/((?!_next/static|_next/image|favicon.ico|sw.js).*)',
    ],
};
