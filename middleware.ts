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

export async function middleware(_request: NextRequest) {
    // Apply security middleware first
    const securityResponse = await securityMiddleware(_request);

    // If security middleware blocks the _request, return immediately
    if (securityResponse.status !== 200) {
        return securityResponse;
    }

    // Apply edge computing optimizations
    return edgeMiddleware(_request);
}

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
