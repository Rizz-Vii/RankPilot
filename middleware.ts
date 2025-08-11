/**
 * Edge Computing & Security Middleware
 * Advanced Architecture Enhancement - DevReady Phase 3
 * 
 * This middleware runs at the edge for:
 * - Global performance optimization
 * - Advanced security protection
 * - Enterprise compliance
 */

import { edgeMiddleware } from '@/lib/edge/edge-config';
import { securityMiddleware } from '@/lib/security/advanced-security';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // Apply security middleware first
    const securityResponse = await securityMiddleware(request);

    // If security middleware blocks the request, return immediately
    if (securityResponse.status !== 200) {
        return securityResponse;
    }

    // Apply edge computing optimizations
    return edgeMiddleware(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with / containing:
         * - _next/static (static assets)
         * - _next/image (optimized images)
         * - _next/webpack-hmr (dev HMR websocket/events)
         * - favicon.ico (favicon)
         * - manifest.json (PWA manifest – keep out of edge/security path to avoid 502 during cold start)
         * - sw.js (service worker script)
         * - robots.txt / sitemap.xml (SEO infrastructure)
         */
        '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml).*)',
    ],
};
