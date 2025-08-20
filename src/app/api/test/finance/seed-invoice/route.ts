import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';

/**
 * Test-only endpoint: seeds a single financeInvoices doc for the authenticated user (or team) to drive live metrics.
 * Disabled in production. Creates new doc each call with deterministic period + random amount unless provided.
 * Query params:
 *  - amount (number, optional)
 *  - status=paid|draft (default paid)
 *  - team=1 (if present and user has teamId claim, writes team scoped invoice)
 */
export const POST = withProvenance(async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'disabled' }, { status: 404 });
    }
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        let uid: string | undefined;
        let decoded: any | undefined;
        if (!authHeader) {
            // Non-production test bypass: ?testUser=email@example.com seeds for that user without auth
            const testUserEmail = new URL(req.url).searchParams.get('testUser');
            if (testUserEmail) {
                const rec = await adminAuth.getUserByEmail(testUserEmail).catch(() => null);
                if (!rec) {
                    const unknownBody = enforceProvenance({ error: 'unknown_test_user' }, { path: 'test/finance/seed-invoice', note: 'missing_auth_testUser_invalid' });
                    return NextResponse.json(unknownBody, { status: 400 });
                }
                uid = rec.uid;
                decoded = { uid };
            } else {
                const authBody = enforceProvenance({ error: 'auth_required' }, { path: 'test/finance/seed-invoice', note: 'missing_auth' });
                return NextResponse.json(authBody, { status: 401 });
            }
        } else {
            const idToken = authHeader.replace(/^Bearer\s+/i, '');
            decoded = await adminAuth.verifyIdToken(idToken);
            uid = (decoded as any).uid;
        }
        const url = new URL(req.url);
        const amountParam = url.searchParams.get('amount');
        const statusParam = url.searchParams.get('status');
        const useTeam = url.searchParams.get('team') === '1';
        const amount = amountParam ? Math.max(1, Number(amountParam)) : Math.floor(50 + Math.random() * 200);
        const status = statusParam === 'draft' ? 'draft' : 'paid';
        const now = new Date();
        const period = now.toISOString().slice(0, 7); // YYYY-MM
        const doc: Record<string, unknown> = {
            userId: uid,
            period,
            amount,
            status,
            issuedAt: now,
            dueAt: now,
            createdAt: now,
            updatedAt: now,
            planTier: 'starter'
        };
        const teamId = (decoded as any)?.teamId;
        if (useTeam && teamId) { (doc as Record<string, unknown>).teamId = teamId; }
        if (status === 'paid') (doc as Record<string, unknown>).paidAt = now;
        await adminDb.collection('financeInvoices').add(doc);
        const okBody = enforceProvenance({ ok: true, period, status, amount }, { path: 'test/finance/seed-invoice', note: 'seeded' });
        return NextResponse.json(okBody);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        const errBody = enforceProvenance({ error: 'internal_error', message }, { path: 'test/finance/seed-invoice', note: 'exception' });
        return NextResponse.json(errBody, { status: 500 });
    }
}, { path: 'test/finance/seed-invoice' });
