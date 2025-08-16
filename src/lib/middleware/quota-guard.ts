/**
 * Quota Enforcement Guard Middleware
 * Returns HTTP 429 when team quotas are exceeded
 */

import { NextRequest, NextResponse } from 'next/server';
import { enforceTeamQuota, checkTeamQuota, QuotaType } from '@/lib/team-quota';

export interface QuotaGuardConfig {
  quotaType: QuotaType;
  teamId?: string;
  plan?: string;
  debugLimit?: number;
  skipEnforcement?: boolean; // For read-only checks
}

export interface QuotaGuardResult {
  allowed: boolean;
  response?: NextResponse;
  quotaInfo?: {
    used: number;
    limit: number;
    remaining: number;
    quotaType: string;
  };
}

/**
 * Quota enforcement guard for API routes
 * Returns 429 response when quota exceeded, or null when allowed
 */
export async function quotaGuard(
  request: NextRequest,
  config: QuotaGuardConfig
): Promise<QuotaGuardResult> {
  const { quotaType, teamId, plan, debugLimit, skipEnforcement = false } = config;

  // Skip if no team ID provided
  if (!teamId) {
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({
          error: 'Team ID required for quota enforcement',
          code: 'MISSING_TEAM_ID',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  try {
    if (skipEnforcement) {
      // Read-only check
      const result = await checkTeamQuota(teamId, quotaType, plan);
      return {
        allowed: result.allowed,
        quotaInfo: {
          used: result.used,
          limit: result.limit,
          remaining: result.remaining,
          quotaType: result.quotaType,
        },
      };
    } else {
      // Enforce quota (increment and check)
      const result = await enforceTeamQuota(teamId, quotaType, plan, debugLimit);
      return {
        allowed: true,
        quotaInfo: {
          used: result.used,
          limit: result.limit,
          remaining: result.remaining,
          quotaType: result.quotaType,
        },
      };
    }
  } catch (error: any) {
    // Handle quota exceeded error
    if (error.code === 'resource-exhausted' || error.httpStatus === 429) {
      const message = error.message || `Team ${quotaType} quota exceeded`;
      
      return {
        allowed: false,
        response: new NextResponse(
          JSON.stringify({
            error: message,
            code: 'QUOTA_EXCEEDED',
            quotaType,
            retryAfter: '24h', // Quotas reset daily
            timestamp: new Date().toISOString(),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '86400', // 24 hours in seconds
              'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 86400),
            },
          }
        ),
      };
    }

    // Handle other errors
    console.error('Quota guard error:', error);
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({
          error: 'Internal quota check error',
          code: 'QUOTA_CHECK_FAILED',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }
}

/**
 * Middleware wrapper for quota enforcement
 * Integrates with existing middleware pipeline
 */
export async function quotaMiddleware(
  request: NextRequest,
  config: QuotaGuardConfig
): Promise<NextResponse | null> {
  const result = await quotaGuard(request, config);
  
  if (result.allowed) {
    // Add quota info to headers for observability
    const headers = new Headers();
    if (result.quotaInfo) {
      headers.set('X-Quota-Type', result.quotaInfo.quotaType);
      headers.set('X-Quota-Used', String(result.quotaInfo.used));
      headers.set('X-Quota-Limit', String(result.quotaInfo.limit));
      headers.set('X-Quota-Remaining', String(result.quotaInfo.remaining));
    }
    
    // Return null to continue pipeline with headers
    return NextResponse.next({ headers });
  }
  
  // Return error response
  return result.response || new NextResponse('Quota check failed', { status: 500 });
}

/**
 * Route-specific quota enforcement helpers
 */
export const quotaGuards = {
  /**
   * Crawler/audit quota enforcement
   */
  async crawlerGuard(request: NextRequest, teamId: string, plan?: string, debugLimit?: number) {
    return quotaGuard(request, {
      quotaType: 'crawlerRuns24h',
      teamId,
      plan,
      debugLimit,
    });
  },

  /**
   * SEO analysis quota enforcement
   */
  async seoAnalysisGuard(request: NextRequest, teamId: string, plan?: string, debugLimit?: number) {
    return quotaGuard(request, {
      quotaType: 'seoAnalyses24h',
      teamId,
      plan,
      debugLimit,
    });
  },

  /**
   * NeuroSEO analysis quota enforcement
   */
  async neuroseoGuard(request: NextRequest, teamId: string, plan?: string, debugLimit?: number) {
    return quotaGuard(request, {
      quotaType: 'neuroseoAnalyses24h',
      teamId,
      plan,
      debugLimit,
    });
  },

  /**
   * Report generation quota enforcement
   */
  async reportGuard(request: NextRequest, teamId: string, plan?: string, debugLimit?: number) {
    return quotaGuard(request, {
      quotaType: 'reportGenerations24h',
      teamId,
      plan,
      debugLimit,
    });
  },
};

/**
 * Extract team ID from various sources in request
 */
export function extractTeamId(request: NextRequest): string | null {
  // Try URL parameters first
  const url = new URL(request.url);
  const teamIdFromParams = url.searchParams.get('teamId');
  if (teamIdFromParams) return teamIdFromParams;

  // Try headers
  const teamIdFromHeader = request.headers.get('x-team-id');
  if (teamIdFromHeader) return teamIdFromHeader;

  // Try body (for POST requests)
  // Note: This would require parsing the body, which is more complex in middleware
  // For now, we expect teamId to be provided via params or headers
  
  return null;
}

/**
 * Helper to check if a route should have quota enforcement
 */
export function shouldEnforceQuota(pathname: string): {
  enforce: boolean;
  quotaType?: QuotaType;
} {
  // Define routes that need quota enforcement
  const quotaRoutes: Array<{ pattern: RegExp; quotaType: QuotaType }> = [
    { pattern: /^\/api\/seo-audit/, quotaType: 'crawlerRuns24h' },
    { pattern: /^\/api\/crawler/, quotaType: 'crawlerRuns24h' },
    { pattern: /^\/api\/neuroseo/, quotaType: 'neuroseoAnalyses24h' },
    { pattern: /^\/api\/seo\/analysis/, quotaType: 'seoAnalyses24h' },
    { pattern: /^\/api\/reports/, quotaType: 'reportGenerations24h' },
  ];

  for (const route of quotaRoutes) {
    if (route.pattern.test(pathname)) {
      return { enforce: true, quotaType: route.quotaType };
    }
  }

  return { enforce: false };
}