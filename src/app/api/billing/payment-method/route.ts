import { NextRequest, NextResponse } from 'next/server';
import { withProvenance, enforceProvenance } from '@/lib/middleware/provenance';
import Stripe from 'stripe';
import { getLogger } from '@/lib/logging/app-logger';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { fetchDefaultCard } from '@/lib/billing/payment-method';

const logger = getLogger('billing-payment-method');
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2025-07-30.basil' as any }) : null;

export const GET = withProvenance(async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
        const res = NextResponse.json(enforceProvenance({ error: 'auth_required' }, { path: 'billing/payment-method', note: 'auth' }), { status: 401 });
        res.headers.set('x-billing-diagnostics', 'auth=missing');
        return res;
    }
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = await adminAuth.verifyIdToken(token);
        const uid = decoded.uid;
        const userSnap = await adminDb.collection('users').doc(uid).get();
        const userData: any = userSnap.exists ? userSnap.data() : null;
        const customerId = userData?.stripeCustomerId;
        if (!customerId) {
            const res = NextResponse.json(enforceProvenance({ paymentMethod: null, reason: 'no_customer' }, { path: 'billing/payment-method', note: 'no_customer' }), { status: 200 });
            res.headers.set('x-billing-diagnostics', 'auth=ok; customer=missing');
            return res;
        }
        if (!stripe) {
            const res = NextResponse.json(enforceProvenance({ paymentMethod: null, reason: 'stripe_unconfigured' }, { path: 'billing/payment-method', note: 'no_stripe' }), { status: 200 });
            res.headers.set('x-billing-diagnostics', 'auth=ok; stripe=missing');
            return res;
        }
        const pm = await fetchDefaultCard(stripe as any, customerId);
        const res = NextResponse.json(enforceProvenance({ paymentMethod: pm }, { path: 'billing/payment-method', note: 'ok' }), { status: 200 });
        res.headers.set('x-billing-diagnostics', `auth=ok; method=${pm ? 'present' : 'none'}`);
        return res;
    } catch (e: any) {
        logger.error('payment_method.endpoint_error', { error: e.message });
        const res = NextResponse.json(enforceProvenance({ error: 'internal_error' }, { path: 'billing/payment-method', note: 'exception' }), { status: 500 });
        res.headers.set('x-billing-diagnostics', 'auth=unknown; error=exception');
        return res;
    }
}, { path: 'billing/payment-method' });
