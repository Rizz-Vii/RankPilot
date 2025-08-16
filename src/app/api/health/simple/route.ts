import { NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import '@/lib/firebase-admin';
import pkg from '../../../../../package.json';

// Capture module load time for uptime calculations
const startedAt = Date.now();

// Simple health probe: fast, lightweight readiness signal with minimal fields.
// Adds version/build info for deployment diagnostics without heavy metrics cost.
export async function GET() {
    try {
        const adminInitialized = getApps().length > 0;
        const buildSha = process.env.BUILD_SHA || 'dev';
        const version = (pkg as any).version || '0.0.0';
        const now = Date.now();
        return NextResponse.json({
            ok: true,
            adminInitialized,
            version,
            buildSha,
            ts: now,
            uptimeMs: now - startedAt
        });
    } catch (e) {
        return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
    }
}
