import { NextResponse } from 'next/server';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import { TeamRateLimitError, applyTeamRateLimit } from '@/lib/rate-limit/team-rate-limit';

// Proxy route to bypass client-side CORS issues when calling callable Cloud Function directly.
// Accepts SEO audit request JSON and forwards to Cloud Function endpoint.
// Includes optional Firebase ID token (Authorization header) for auth preservation.

const REGION = 'australia-southeast2';
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';
const FUNCTION_NAME = 'runSeoAudit';
const FUNCTION_URL = `https://${REGION}-${PROJECT}.cloudfunctions.net/${FUNCTION_NAME}`;

export const POST = withProvenance(async function (req: Request) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body || typeof body.url !== 'string') {
            return NextResponse.json(enforceProvenance({ success: false, error: 'Invalid request: url required', provenance: 'synthetic' }, { path: 'seo-audit/run', note: 'validation' }), { status: 400 });
        }

        // TEAM-01: Apply team rate limit if teamId provided (lightweight - before upstream call)
        if (typeof (body as any).teamId === 'string') {
            const teamId = (body as any).teamId as string;
            try {
                const res = await applyTeamRateLimit(teamId);
                if (res && res.allowed) {
                    (req as any)._teamRateHeaders = { ...res.headers, 'X-RateLimit-Policy': 'bucket' };
                } else if (res && !res.allowed) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'rate_limited', retryAfter: res.retryAfterSeconds, provenance: 'synthetic' }, { path: 'seo-audit/run', note: 'rate_limit' }), { status: 429, headers: { ...res.headers, 'X-RateLimit-Policy': 'bucket' } });
                }
            } catch (e) {
                if (e instanceof TeamRateLimitError) {
                    return NextResponse.json(enforceProvenance({ success: false, error: 'rate_limited', retryAfter: e.retryAfterSeconds, provenance: 'synthetic' }, { path: 'seo-audit/run', note: 'rate_limit' }), { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds), 'X-RateLimit-Policy': 'bucket' } });
                }
            }
        }
        // Forward request in callable format ({data: {...}})
        const token = req.headers.get('authorization');
        const cfResp = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: token } : {}),
            },
            body: JSON.stringify({ data: body })
        });

        if (!cfResp.ok) {
            const text = await cfResp.text();
            return NextResponse.json(enforceProvenance({ success: false, error: 'Function call failed', details: text, provenance: 'synthetic' }, { path: 'seo-audit/run', note: 'upstream' }), { status: cfResp.status });
        }

        // Callable functions wrap response JSON in {result: ...} or raw; parse generically
        const json = await cfResp.json();
        const data = json?.result || json;
        const base = NextResponse.json(enforceProvenance({ success: true, data, provenance: 'live' }, { path: 'seo-audit/run' }), { status: 200 });
        const rateHeaders = (req as any)._teamRateHeaders;
        if (rateHeaders) {
            Object.entries(rateHeaders).forEach(([k, v]) => base.headers.set(k, v as string));
        }
        return base;
    } catch (e: unknown) {
        return NextResponse.json(enforceProvenance({ success: false, error: (e as any)?.message || 'Proxy error', provenance: 'synthetic' }, { path: 'seo-audit/run', note: 'exception' }), { status: 500 });
    }
}, { path: 'seo-audit/run' });
