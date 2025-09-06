import { generateInsights as runGenerateInsights } from '@/ai/flows/generate-insights';
import { adminAuth } from '@/lib/firebase-admin';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split(' ')[1];
        await adminAuth.verifyIdToken(idToken);

        const body = await req.json().catch(() => ({}));
        if (!body || typeof body !== 'object' || !Array.isArray(body.activities)) {
            return NextResponse.json({ error: 'Invalid payload: activities[] required' }, { status: 400 });
        }

        // Delegate to the server-side insights flow
        const result = await runGenerateInsights({ activities: body.activities });
        return NextResponse.json(result, { status: 200 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg || 'Failed to generate insights' }, { status: 500 });
    }
}
