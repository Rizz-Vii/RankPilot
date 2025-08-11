import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getLogger } from '@/lib/logging/app-logger';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { fetchDefaultCard } from '@/lib/billing/payment-method';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-07-30.basil' });

export async function GET(req: NextRequest) {
    const logger = getLogger('billing-payment-method');
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const decoded = await adminAuth.verifyIdToken(token);
        const uid = decoded.uid;
        const userSnap = await adminDb.collection('users').doc(uid).get();
        const userData: any = userSnap.exists ? userSnap.data() : null;
        const customerId = userData?.stripeCustomerId;
        if (!customerId) return NextResponse.json({ paymentMethod: null, reason: 'no_customer' });
        const pm = await fetchDefaultCard(stripe as any, customerId);
        return NextResponse.json({ paymentMethod: pm });
    } catch (e: any) {
        logger.error('payment_method.endpoint_error', { error: e.message });
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
