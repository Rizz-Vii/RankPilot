import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(_request: NextRequest) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let _event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err);
        return NextResponse.json({ _error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                console.log('🎉 Checkout completed:', session.id);
                await updateUserSubscription(session);
                break;
            }

            case 'customer.subscription.created': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log('📝 Subscription created:', subscription.id);
                await handleSubscriptionCreated(subscription);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log('🔄 Subscription updated:', subscription.id);
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log('❌ Subscription cancelled:', subscription.id);
                await downgradeToFreeTier(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('💰 Payment succeeded:', invoice.id);
                await handlePaymentSucceeded(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('💥 Payment failed:', invoice.id);
                await handleFailedPayment(invoice);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });

    } catch (_error) {
        console.error('❌ Webhook handler _error:', _error);
        return NextResponse.json(
            { _error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}

async function updateUserSubscription(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.planId;

    if (!userId || !tier) {
        console.error('Missing userId or tier in session metadata');
        return;
    }

    try {
        await updateDoc(doc(db, 'users', userId), {
            subscriptionTier: tier,
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription,
            subscriptionStatus: 'active',
            updatedAt: new Date(),
        });

        console.log(`✅ Updated user ${userId} to ${tier} tier`);
    } catch (_error) {
        console.error('❌ Failed to update user subscription:', _error);
    }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;
    const tier = subscription.metadata.planId;

    if (!userId) return;

    try {
        await updateDoc(doc(db, 'users', userId), {
            subscriptionTier: tier,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            stripeCustomerId: subscription.customer,
            updatedAt: new Date(),
        });

        console.log(`✅ Subscription created for user ${userId}`);
    } catch (_error) {
        console.error('❌ Failed to handle subscription creation:', _error);
    }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;

    if (!userId) return;

    try {
        await updateDoc(doc(db, 'users', userId), {
            subscriptionStatus: subscription.status,
            updatedAt: new Date(),
        });

        console.log(`✅ Subscription updated for user ${userId}`);
    } catch (_error) {
        console.error('❌ Failed to handle subscription update:', _error);
    }
}

async function downgradeToFreeTier(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;

    if (!userId) return;

    try {
        await updateDoc(doc(db, 'users', userId), {
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            subscriptionId: null,
            updatedAt: new Date(),
        });

        console.log(`✅ Downgraded user ${userId} to free tier`);
    } catch (_error) {
        console.error('❌ Failed to downgrade user:', _error);
    }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    try {
        // Find user by customer ID and update subscription status
        console.log(`✅ Payment succeeded for customer: ${customerId}`);
    } catch (_error) {
        console.error('❌ Failed to handle payment success:', _error);
    }
}

async function handleFailedPayment(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    try {
        console.log(`⚠️ Payment failed for customer: ${customerId}`);
        // TODO: Send email notification about failed payment
    } catch (_error) {
        console.error('❌ Failed to handle payment failure:', _error);
    }
}
