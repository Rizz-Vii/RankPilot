import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function bad(status: number, error: string) {
    return NextResponse.json({ error }, { status });
}

function ok(data: unknown, init?: number) {
    return NextResponse.json(data as Record<string, unknown>, { status: init ?? 200 });
}

export async function GET(req: Request) {
    // Dev-only helper: require probe token in prod, allow freely in non-prod.
    const probe = (req.headers as Headers).get('x-probe-token');
    if (process.env.NODE_ENV === 'production') {
        if (!probe || probe !== process.env.CRAWL_PROBE_TOKEN) return bad(403, 'forbidden');
    }
    try {
        // Fetch most recent appointments (best-effort; returns [] if mock admin)
        let snap: unknown;
        try {
            // Firestore Admin SDK types may not be present in mocks; keep unknown and narrow later
            snap = await (adminDb as unknown as {
                collection: (name: string) => {
                    orderBy: (field: string, dir: 'asc' | 'desc') => { limit: (n: number) => { get: () => Promise<unknown> } };
                    limit: (n: number) => { get: () => Promise<unknown> };
                };
            })
                .collection('appointments')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
        } catch {
            // Some mocks don't support orderBy; retry without it
            try {
                snap = await (adminDb as unknown as {
                    collection: (name: string) => { limit: (n: number) => { get: () => Promise<unknown> } };
                }).collection('appointments').limit(5).get();
            } catch {
                snap = { empty: true, docs: [] };
            }
        }

        const docs = (snap as { docs?: unknown[]; empty?: boolean } | undefined)?.docs;
        const items = Array.isArray(docs)
            ? docs.map((d) => {
                const ref = d as { id?: unknown; data?: () => unknown };
                const rawData = typeof ref.data === 'function' ? ref.data() : {};
                const data = (rawData ?? {}) as Record<string, unknown>;
                return {
                    id: typeof ref.id === 'string' ? ref.id : '',
                    apptId: (typeof data.apptId === 'string' ? data.apptId : typeof ref.id === 'string' ? ref.id : '') || '',
                    createdAt: data.createdAt ?? null,
                    customer: data.customer ?? null,
                    source: data.source ?? null,
                    status: data.status ?? null,
                };
            })
            : [];

        return ok({ appointments: items });
    } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
        return bad(500, msg || 'internal_error');
    }
}
