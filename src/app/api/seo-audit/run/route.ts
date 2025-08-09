import { NextRequest, NextResponse } from 'next/server';

// Proxy route to bypass client-side CORS issues when calling callable Cloud Function directly.
// Accepts SEO audit request JSON and forwards to Cloud Function endpoint.
// Includes optional Firebase ID token (Authorization header) for auth preservation.

const REGION = 'australia-southeast2';
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';
const FUNCTION_NAME = 'runSeoAudit';
const FUNCTION_URL = `https://${REGION}-${PROJECT}.cloudfunctions.net/${FUNCTION_NAME}`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body || typeof body.url !== 'string') {
            return NextResponse.json({ error: 'Invalid request: url required' }, { status: 400 });
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
            return NextResponse.json({ error: 'Function call failed', details: text }, { status: cfResp.status });
        }

        // Callable functions wrap response JSON in {result: ...} or raw; parse generically
        const json = await cfResp.json();
        const data = json?.result || json;
        return NextResponse.json(data, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Proxy error' }, { status: 500 });
    }
}
