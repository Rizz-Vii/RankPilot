import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, getDocs, query, where, getDoc, setDoc } from 'firebase/firestore';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/lib/logging/app-logger';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-07-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    const logger = getLogger('stripe-webhook');
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        logger.warn('signature.verification_failed', { error: (err as Error).message });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        // FIN-01 Idempotency: skip if event already processed
        const processedRef = doc(db, 'stripeProcessedEvents', event.id);
        const processedSnap = await getDoc(processedRef);
        if (processedSnap.exists()) {
            logger.info('event.duplicate', { eventId: event.id, type: event.type });
            return NextResponse.json({ received: true, duplicate: true });
        }
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                logger.info('checkout.session.completed', { sessionId: session.id });
                await updateUserSubscription(session);
                break;
            }

            case 'customer.subscription.created': {
                const subscription = event.data.object as Stripe.Subscription;
                logger.info('subscription.created', { subscriptionId: subscription.id });
                await handleSubscriptionCreated(subscription);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                logger.info('subscription.updated', { subscriptionId: subscription.id });
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                logger.info('subscription.canceled', { subscriptionId: subscription.id });
                await downgradeToFreeTier(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.info('invoice.payment_succeeded', { invoiceId: invoice.id });
                await handlePaymentSucceeded(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.warn('invoice.payment_failed', { invoiceId: invoice.id });
                await handleFailedPayment(invoice);
                break;
            }

            default:
                logger.warn('unhandled_event', { eventType: event.type });
        }

        // Mark as processed (non-blocking if fails)
        try { await setDoc(processedRef, { id: event.id, type: event.type, createdAt: new Date() }, { merge: false }); } catch (e) { logger.degraded('processedEvent.persist_failed', { eventId: event.id, error: (e as Error).message }); }
        return NextResponse.json({ received: true, processed: true });

    } catch (error) {
        logger.error('webhook.handler_error', { error: (error as Error).message });
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}

async function updateUserSubscription(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.planId;

    const logger = getLogger('stripe-webhook');
    if (!userId || !tier) {
        logger.warn('subscription.metadata_missing', { userId, tier });
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

        logger.info('user.subscription.tierUpdated', { userId, tier });
    } catch (error) {
        logger.degraded('user.subscription.update_failed', { userId, error: (error as Error).message });
    }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;
    const tier = subscription.metadata.planId;

    const logger = getLogger('stripe-webhook');
    if (!userId) { logger.warn('subscription.created.metadata_missing'); return; }

    try {
        await updateDoc(doc(db, 'users', userId), {
            subscriptionTier: tier,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            stripeCustomerId: subscription.customer,
            updatedAt: new Date(),
        });

        logger.info('user.subscription.created', { userId, subscriptionId: subscription.id });
    } catch (error) {
        logger.degraded('user.subscription.create_failed', { userId, error: (error as Error).message });
    }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;

    const logger = getLogger('stripe-webhook');
    if (!userId) { logger.warn('subscription.updated.metadata_missing'); return; }

    try {
        await updateDoc(doc(db, 'users', userId), {
            subscriptionStatus: subscription.status,
            updatedAt: new Date(),
        });

        logger.info('user.subscription.updated', { userId, subscriptionId: subscription.id });
    } catch (error) {
        logger.degraded('user.subscription.update_failed', { userId, error: (error as Error).message });
    }
}

async function downgradeToFreeTier(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;

    const logger = getLogger('stripe-webhook');
    if (!userId) { logger.warn('subscription.deleted.metadata_missing'); return; }

    try {
        await updateDoc(doc(db, 'users', userId), {
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            subscriptionId: null,
            updatedAt: new Date(),
        });

        logger.info('user.subscription.downgraded', { userId });
    } catch (error) {
        logger.degraded('user.subscription.downgrade_failed', { userId, error: (error as Error).message });
    }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const logger = getLogger('stripe-webhook');
    try {
        logger.info('payment.succeeded', { customerId });
    } catch (error) {
        logger.degraded('payment.success_handler_failed', { customerId, error: (error as Error).message });
    }
}

async function handleFailedPayment(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const logger = getLogger('stripe-webhook');
    try {
        logger.warn('payment.failed', { customerId });
        // Lookup user by stripeCustomerId
        const usersQ = query(collection(db, 'users'), where('stripeCustomerId', '==', customerId));
        const snap = await getDocs(usersQ);
        if (!snap.empty) {
            const userDoc = snap.docs[0];
            await updateDoc(userDoc.ref, { subscriptionStatus: 'past_due', updatedAt: new Date() });
            await addDoc(collection(db, 'email_logs'), {
                userId: userDoc.id,
                type: 'payment_failed',
                invoiceId: invoice.id,
                amountDue: invoice.amount_due,
                currency: invoice.currency,
                createdAt: new Date(),
            });
        }
    } catch (error) {
        logger.degraded('payment.failure_handler_failed', { customerId, error: (error as Error).message });
    }
}
