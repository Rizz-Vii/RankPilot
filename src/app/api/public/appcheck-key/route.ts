import { NextResponse } from 'next/server';

// Public endpoint returning the App Check site key for client-side initialization.
// Safe to expose: site keys are public by design. Secret key is never exposed here.
export async function GET() {
    const siteKey = process.env.NEXT_PUBLIC_APPCHECK_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

    // Basic JSON response with short caching to allow key rotation
    const body = {
        siteKey,
        provider: 'recaptcha-v3' as const,
        hasKey: Boolean(siteKey),
    };

    const res = NextResponse.json(body, { status: 200 });
    res.headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.headers.set('Content-Type', 'application/json; charset=utf-8');
    return res;
}
