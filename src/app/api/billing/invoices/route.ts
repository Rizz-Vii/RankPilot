import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getLogger } from '@/lib/logging/app-logger';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';

// Composite cursor pagination over financeInvoices
// Refinement (FIN-02): order by period desc, then createdAt desc to avoid skipping invoices when multiple share the same period.
// Cursor format: `${period}|${createdAtMs}` (createdAt in epoch ms). Backward compatibility: plain period cursor still accepted.
// Requires composite index: (userId, period desc, createdAt desc)

export const GET = withProvenance(async function GET(req: Request) {
    const nreq = req as NextRequest;
    const logger = getLogger('billing-invoices');
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader) {
            const res = NextResponse.json(enforceProvenance({ error: 'auth_required' }, { path: 'billing/invoices', note: 'auth' }), { status: 401 });
            res.headers.set('x-billing-diagnostics', 'auth=missing');
            return res;
        }
        const token = authHeader.replace('Bearer ', '');
        const decoded = await adminAuth.verifyIdToken(token);
        const uid = decoded.uid;
        const { searchParams } = new URL(nreq.url);
        const limitParam = parseInt(searchParams.get('limit') || '10', 10);
        const limitVal = Math.min(Math.max(1, isNaN(limitParam) ? 10 : limitParam), 50);
        const rawCursor = searchParams.get('cursor') || undefined; // period or period|createdAtMs
        // Build base query with composite ordering
        let q: FirebaseFirestore.Query = adminDb
            .collection('financeInvoices')
            .where('userId', '==', uid)
            .orderBy('period', 'desc')
            .orderBy('createdAt', 'desc')
            .limit(limitVal + 1); // fetch one extra for hasMore
        if (rawCursor) {
            if (rawCursor.includes('|')) {
                const [periodCursor, createdAtMsStr] = rawCursor.split('|');
                const createdAtMs = parseInt(createdAtMsStr, 10);
                const createdAtDate = isNaN(createdAtMs) ? new Date(0) : new Date(createdAtMs);
                q = q.startAfter(periodCursor, createdAtDate);
            } else {
                // Legacy period-only cursor: skip entire period by using minimal createdAt sentinel.
                q = q.startAfter(rawCursor, new Date(0));
            }
        }
        const snap = await q.get();
        let docs = snap.docs.map(d => {
            const raw = d.data() as Record<string, unknown>;
            return { id: d.id, ...raw } as Record<string, unknown>;
        });
        const hasMore = docs.length > limitVal;
        if (hasMore) docs = docs.slice(0, limitVal);
        docs = docs.map((invRaw) => {
            const inv = invRaw as Record<string, unknown>;
            // Normalize createdAt for cursor generation
            const toDate = (v: unknown): Date | undefined => {
                if (!v) return undefined;
                if (v instanceof Date) return v;
                const maybe = v as { toDate?: () => Date };
                return typeof maybe.toDate === 'function' ? maybe.toDate() : undefined;
            };
            const createdAt: Date = toDate(inv.createdAt) || toDate(inv.issuedAt) || new Date(String(inv.date || `${inv.period}-01T00:00:00Z`));
            return {
                ...inv,
                description: (inv.description as string) || `Invoice ${String(inv.period)}`,
                date: (inv.date as string) || createdAt.toISOString(),
                createdAt: createdAt, // ensure returned
            };
        });
        const last = docs[docs.length - 1] as Record<string, unknown> | undefined;
        const nextCursor = hasMore && last ? `${String(last.period)}|${(last.createdAt as Date).getTime()}` : undefined;
        logger.debug('billing-invoices.page', { uid, count: docs.length, hasMore, nextCursor });
        const res = NextResponse.json(enforceProvenance({ invoices: docs, hasMore, nextCursor }, { path: 'billing/invoices', note: 'page' }));
        res.headers.set('x-billing-diagnostics', `auth=ok; items=${docs.length}; hasMore=${hasMore}`);
        return res;
    } catch (e: unknown) {
        logger.error('billing-invoices.error', { error: (e as any)?.message });
        const res = NextResponse.json(enforceProvenance({ error: 'internal_error' }, { path: 'billing/invoices', note: 'exception' }), { status: 500 });
        res.headers.set('x-billing-diagnostics', 'auth=unknown; error=exception');
        return res;
    }
}, { path: 'billing/invoices' });
