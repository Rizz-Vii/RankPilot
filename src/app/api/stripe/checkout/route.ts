import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(request: Request) {
    const nreq = request as NextRequest;
    try {
        const { tier, billingInterval, successUrl, cancelUrl } = await nreq.json();

        // Validate required fields
        if (!tier) {
            return NextResponse.json({ error: 'Subscription tier is required' }, { status: 400 });
        }

        // Free tier doesn't need Stripe
        if (tier === 'free') {
            return NextResponse.json({ error: 'Free tier does not require payment' }, { status: 400 });
        }

        // Validate tier
        const validTiers = ['starter', 'agency', 'enterprise'];
        if (!validTiers.includes(tier)) {
            return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
        }

        // Create checkout session via Firebase Function
        const result = await createCheckoutSession({
            planId: tier,
            billingInterval: billingInterval || 'monthly',
            successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
            cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
        });

        const { sessionId } = result.data as { sessionId: string; };

        return NextResponse.json({
            sessionId,
            url: `https://checkout.stripe.com/pay/${sessionId}`,
        });

    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.error('❌ Stripe checkout error:', err);

        // Handle Firebase Function errors
        if (err.code === 'unauthenticated') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        return NextResponse.json(
            { error: err.message || 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}

// Handle checkout session retrieval
export async function GET(request: Request) {
    const nreq = request as NextRequest;
    try {
        const { searchParams } = new URL(nreq.url);
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
        }

        // Retrieve session details from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return NextResponse.json({
            sessionId,
            status: session.payment_status,
            amountTotal: session.amount_total,
            currency: session.currency,
            customerEmail: session.customer_email,
            paymentIntent: session.payment_intent,
            subscription: session.subscription,
        });

    } catch (error: unknown) {
        console.error('❌ Checkout retrieval error:', error as any);
        return NextResponse.json(
            { error: 'Failed to retrieve checkout session' },
            { status: 500 }
        );
    }
}
