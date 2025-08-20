import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, getDocs, query, where, getDoc, setDoc } from 'firebase/firestore';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getLogger } from '@/lib/logging/app-logger';
import Stripe from 'stripe';
// NOTE: Functions env centralizes invoice persistence. For ISR / local dev parity we duplicate minimal upsert using client Firestore.
async function upsertFinanceInvoiceClient(invoice: any) {
    try {
        const customerId = invoice?.customer as string | undefined;
        if (!customerId) return;
        const usersQ = query(collection(db, 'users'), where('stripeCustomerId', '==', customerId));
        const snap = await getDocs(usersQ);
        if (snap.empty) return;
        const userId = snap.docs[0].id;
        const period = new Date((((invoice?.period_end ?? invoice?.created) as number) * 1000)).toISOString().slice(0, 7);
        const status = (invoice?.status as string) || 'open';
        const amount = ((invoice?.amount_paid || invoice?.amount_due || 0) as number) / 100;
        const issuedAt = new Date((invoice?.created as number) * 1000);
        const dueAt = invoice?.due_date ? new Date((invoice?.due_date as number) * 1000) : null;
        const paidAt = invoice?.status === 'paid' && invoice?.status_transitions?.paid_at ? new Date((invoice?.status_transitions?.paid_at as number) * 1000) : null;
        const firstLine: any = invoice?.lines?.data?.[0];
        const planTier = firstLine?.price?.metadata?.planTier || invoice?.metadata?.planTier || null;
        const ref = doc(db, 'financeInvoices', invoice?.id as string);
        // merge keeps createdAt if exists
        await setDoc(ref, { userId, period, amount, status, issuedAt, dueAt, paidAt, planTier, currency: invoice?.currency, updatedAt: new Date(), createdAt: new Date() }, { merge: true });
    } catch (e) {
        getLogger('stripe-webhook').degraded('invoice.upsert.client_failed', { invoiceId: (invoice as any)?.id, error: (e as Error).message });
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(request: Request) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    const logger = getLogger('stripe-webhook');
    if (!signature) {
        logger.warn('signature.missing');
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }
    if (!webhookSecret) {
        logger.error('webhook.missing_secret');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;

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
            // TODO(T6): unify financeInvoices upsert with functions webhook implementation (invoice events)
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
                await upsertFinanceInvoiceClient(invoice);
                await handlePaymentSucceeded(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.warn('invoice.payment_failed', { invoiceId: invoice.id });
                await upsertFinanceInvoiceClient(invoice);
                await handleFailedPayment(invoice);
                break;
            }
            case 'invoice.created': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.info('invoice.created', { invoiceId: invoice.id });
                await upsertFinanceInvoiceClient(invoice);
                break;
            }
            case 'invoice.finalized': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.info('invoice.finalized', { invoiceId: invoice.id });
                await upsertFinanceInvoiceClient(invoice);
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
