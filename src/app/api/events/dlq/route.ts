import { getDeadLetters } from '@/lib/events/dead-letter';
import { enforceProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseBool(v: string | null): boolean {
    if (!v) return false;
    const s = v.toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

function extractMessage(err: unknown): string {
    if (err instanceof Error && typeof err.message === 'string') return err.message;
    if (err && typeof err === 'object') {
        const maybe = (err as { message?: unknown }).message;
        if (typeof maybe === 'string') return maybe;
    }
    try { return String(err); } catch { return 'error'; }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const url = new URL(req.url);
        const limitParam = url.searchParams.get('limit');
        const includePayload = parseBool(url.searchParams.get('includePayload'));
        const maxPreviewBytesParam = url.searchParams.get('maxPayloadBytes');
        const limitRaw = Number.parseInt(limitParam || '', 10);
        const maxPreviewRaw = Number.parseInt(maxPreviewBytesParam || '', 10);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50; // hard-cap
        const maxPreviewBytes = Number.isFinite(maxPreviewRaw) && maxPreviewRaw >= 0 ? Math.min(maxPreviewRaw, 4096) : 1024; // guard

        const items = getDeadLetters(limit);
        const encoder = new TextEncoder();
        const safe = items.map(it => {
            const msg = extractMessage(it.error);
            const payloadStr = JSON.stringify(it.payload ?? {});
            const payloadBytes = encoder.encode(payloadStr).length;
            const payloadPreview = includePayload && maxPreviewBytes > 0
                ? (payloadStr.length > maxPreviewBytes ? `${payloadStr.slice(0, maxPreviewBytes)}…` : payloadStr)
                : undefined;
            return {
                type: it.type,
                attempts: it.attempts,
                ts: it.ts,
                error: { message: msg },
                payloadBytes,
                ...(includePayload && payloadPreview !== undefined ? { payloadPreview } : {}),
            };
        });

        const body = enforceProvenance(
            {
                ok: true,
                total: safe.length,
                limit,
                items: safe,
            },
            { path: 'events/dlq', note: 'ok' }
        );
        const resp = NextResponse.json(body, { status: 200 });
        resp.headers.set('Cache-Control', 'no-store');
        return resp;
    } catch (err: unknown) {
        const body = enforceProvenance(
            { ok: false, error: 'internal_error', message: process.env.NODE_ENV !== 'production' ? extractMessage(err) : undefined },
            { path: 'events/dlq', note: 'exception' }
        );
        return NextResponse.json(body, { status: 500 });
    }
}
