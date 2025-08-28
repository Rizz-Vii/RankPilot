import { adminApp } from '@/lib/firebase-admin';
import { noStoreHeaders } from '@/lib/http/cache';
import { handleCors } from '@/lib/http/cors';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pkg from '../../../../../package.json';

// Capture module load time for uptime calculations
const startedAt = Date.now();

// Simple health probe: fast, lightweight readiness signal with minimal fields.
// Adds version/build info for deployment diagnostics without heavy metrics cost.
export async function GET(req: NextRequest): Promise<Response> {
    const cors = handleCors(req, { allowMethods: ['GET', 'OPTIONS'] });
    if ('preflight' in cors) return cors.preflight as Response;
    try {
        // Use centralized admin app; in dev we may have a mock app
        const adminInitialized = Boolean(adminApp && (adminApp as { name?: string }).name);
        const buildSha =
            process.env.BUILD_SHA ||
            process.env.GITHUB_SHA ||
            process.env.VERCEL_GIT_COMMIT_SHA ||
            process.env.SOURCE_VERSION ||
            'dev';
        const version = (pkg as { version?: string })?.version ?? '0.0.0';
        const now = Date.now();
        return NextResponse.json({
            ok: true,
            adminInitialized,
            version,
            buildSha,
            ts: now,
            uptimeMs: now - startedAt
        }, { headers: { ...noStoreHeaders(), ...cors.headers } });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500, headers: { ...noStoreHeaders(), ...cors.headers } }
        );
    }
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
    const cors = handleCors(req, { allowMethods: ['GET', 'OPTIONS'] });
    return 'preflight' in cors ? (cors.preflight as Response) : new Response(null, { status: 204, headers: cors.headers });
}
