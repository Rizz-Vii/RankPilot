import { NextResponse } from 'next/server';
// Canonical Stripe webhook is handled by Firebase Cloud Functions (functions/src/stripe-webhook.ts).
// This Next.js route stays disabled by default to prevent duplicate processing.
// If STRIPE_WEBHOOK_FORWARD_URL is set, we forward the request to the canonical endpoint.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
    const forwardUrl = process.env.STRIPE_WEBHOOK_FORWARD_URL;
    if (!forwardUrl) {
        return NextResponse.json({ error: 'Stripe webhook handled by Cloud Functions' }, { status: 410 });
    }
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature') || '';
        const contentType = request.headers.get('content-type') || 'application/json';
        const res = await fetch(forwardUrl, {
            method: 'POST',
            headers: {
                'stripe-signature': signature,
                'content-type': contentType,
            },
            body,
        });
        const text = await res.text();
        return new NextResponse(text, {
            status: res.status,
            headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
        });
    } catch {
        return NextResponse.json({ error: 'Forwarding failed' }, { status: 502 });
    }
}
/*
import { adminDb } from '@/lib/firebase-admin';
import { getLogger } from '@/lib/logging/app-logger';
import { enforceProvenance } from '@/lib/middleware/provenance';
import { headers } from 'next/headers';
import Stripe from 'stripe';
// Minimal invoice upsert using Admin SDK (keep in sync with any Functions implementation)
async function upsertFinanceInvoice(invoice: unknown) {
    try {
        const invoiceObj = invoice as Stripe.Invoice;
        const customerId = invoiceObj?.customer as string | undefined;
        if (!customerId) return;
        const snap = await adminDb.collection('users').where('stripeCustomerId', '==', customerId).get();
        if (snap.empty) return;
        const userId = snap.docs[0].id;
        const period = new Date(((invoiceObj?.period_end ?? invoiceObj?.created) as number) * 1000).toISOString().slice(0, 7);
        const status = (invoiceObj?.status as string) || 'open';
        const amount = ((invoiceObj?.amount_paid || invoiceObj?.amount_due || 0) as number) / 100;
        const issuedAt = new Date((invoiceObj?.created as number) * 1000);
        const dueAt = invoiceObj?.due_date ? new Date((invoiceObj?.due_date as number) * 1000) : null;
        const paidAt = invoiceObj?.status === 'paid' && invoiceObj?.status_transitions?.paid_at ? new Date((invoiceObj?.status_transitions?.paid_at as number) * 1000) : null;
        const firstLine = invoiceObj?.lines?.data?.[0] as Stripe.InvoiceLineItem | undefined;
        // Narrow price metadata safely without using any (Stripe types may omit metadata in some versions)
        let priceMeta: Record<string, unknown> | undefined;
        if (firstLine && typeof firstLine === 'object') {
            const priceVal: unknown = (firstLine as { price?: unknown }).price;
            if (priceVal && typeof priceVal === 'object' && 'metadata' in priceVal) {
                const metaUnknown = (priceVal as { metadata?: unknown }).metadata;
                if (metaUnknown && typeof metaUnknown === 'object') {
                    priceMeta = metaUnknown as Record<string, unknown>;
                }
            }
        }
        const planTier = (priceMeta && typeof priceMeta.planTier === 'string' ? priceMeta.planTier as string : undefined)
            || (invoiceObj?.metadata?.planTier as string | undefined)
            || null;
        const ref = adminDb.collection('financeInvoices').doc(invoiceObj?.id as string);
        await ref.set(
            { userId, period, amount, status, issuedAt, dueAt, paidAt, planTier, currency: invoiceObj?.currency, updatedAt: new Date(), createdAt: new Date() },
            { merge: true }
        );
    } catch (e) {
        const invoiceId = typeof invoice === 'object' && invoice !== null && 'id' in invoice && typeof (invoice as Record<string, unknown>).id === 'string' ? (invoice as Record<string, unknown>).id as string : undefined;
        getLogger('stripe-webhook').degraded('invoice.upsert.client_failed', { invoiceId, error: (e as Error).message });
    }
}

function getStripe(): Stripe | null {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new Stripe(key);
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(request: Request) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    const logger = getLogger('stripe-webhook');
    if (!signature) {
        logger.warn('signature.missing');
        return NextResponse.json(
            enforceProvenance({ error: 'Missing stripe-signature header' }, { path: 'stripe/webhook', note: 'signature' }),
            { status: 400 }
        );
    }
    if (!webhookSecret) {
        logger.error('webhook.missing_secret');
        return NextResponse.json(
            enforceProvenance({ error: 'Webhook secret not configured' }, { path: 'stripe/webhook', note: 'config' }),
            { status: 500 }
        );
    }

    let event: Stripe.Event;
    const stripe = getStripe();
    if (!stripe) {
        logger.error('webhook.misconfigured', { reason: 'missing_secret_key' });
        return NextResponse.json(
            enforceProvenance({ error: 'Stripe not configured' }, { path: 'stripe/webhook', note: 'config' }),
            { status: 500 }
        );
    }

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        logger.warn('signature.verification_failed', { error: (err as Error).message });
        return NextResponse.json(
            enforceProvenance({ error: 'Invalid signature' }, { path: 'stripe/webhook', note: 'signature' }),
            { status: 400 }
        );
    }

    try {
        // FIN-01 Idempotency: skip if event already processed
        const processedRef = adminDb.collection('stripeProcessedEvents').doc(event.id);
        const processedSnap = await processedRef.get();
        if (processedSnap.exists) {
            logger.info('event.duplicate', { eventId: event.id, type: event.type });
        return NextResponse.json(
            enforceProvenance({ received: true, duplicate: true }, { path: 'stripe/webhook', note: 'duplicate' })
        );
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
                await upsertFinanceInvoice(invoice);
                await handlePaymentSucceeded(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.warn('invoice.payment_failed', { invoiceId: invoice.id });
                await upsertFinanceInvoice(invoice);
                await handleFailedPayment(invoice);
                break;
            }
            case 'invoice.created': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.info('invoice.created', { invoiceId: invoice.id });
                await upsertFinanceInvoice(invoice);
                break;
            }
            case 'invoice.finalized': {
                const invoice = event.data.object as Stripe.Invoice;
                logger.info('invoice.finalized', { invoiceId: invoice.id });
                await upsertFinanceInvoice(invoice);
                break;
            }

            default:
                logger.warn('unhandled_event', { eventType: event.type });
        }

        // Mark as processed (non-blocking if fails)
    try { await processedRef.set({ id: event.id, type: event.type, createdAt: new Date() }, { merge: false }); } catch (err) { logger.degraded('processedEvent.persist_failed', { eventId: event.id, error: (err as Error).message }); }
        return NextResponse.json(
            enforceProvenance({ received: true, processed: true }, { path: 'stripe/webhook', note: 'ok' })
        );

    } catch (error) {
        logger.error('webhook.handler_error', { error: (error as Error).message });
        return NextResponse.json(
            enforceProvenance({ error: 'Webhook handler failed' }, { path: 'stripe/webhook', note: 'exception' }),
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
        await adminDb.collection('users').doc(userId).update({
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
        await adminDb.collection('users').doc(userId).update({
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
        await adminDb.collection('users').doc(userId).update({
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
        await adminDb.collection('users').doc(userId).update({
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
        const snap = await adminDb.collection('users').where('stripeCustomerId', '==', customerId).get();
        if (!snap.empty) {
            const userDoc = snap.docs[0];
            await userDoc.ref.update({ subscriptionStatus: 'past_due', updatedAt: new Date() });
            await adminDb.collection('email_logs').add({
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
*/
