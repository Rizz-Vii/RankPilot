// 🚀 RankPilot Stripe Integration - Complete Implementation
// File: src/lib/stripe/subscription-management.ts

import Stripe from 'stripe';

function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Stripe not configured');
    return new Stripe(key);
}
type StripeSubLike = {
    current_period_end?: number;
    trial_end?: number;
    cancel_at_period_end?: boolean;
};

// RankPilot Subscription Tiers Configuration
export const RANKPILOT_TIERS = {
    free: {
        name: 'Free Tier',
        price: 0,
        priceId: null, // No Stripe price for free tier
        features: {
            neuroSeoQueries: 10,
            competitors: 1,
            users: 1,
            support: 'community'
        }
    },
    starter: {
        name: 'Starter Tier',
        price: 29,
        priceId: 'price_1RqFwc2fkoCQ0GTp8wygbgXh', // Your actual Stripe Price ID
        features: {
            neuroSeoQueries: 100,
            competitors: 5,
            users: 1,
            support: 'email'
        }
    },
    agency: {
        name: 'Agency Tier',
        price: 99,
        priceId: 'price_1RqGKB2fkoCQ0GTpqLKUkyV5', // ← NEW REAL PRICE ID
        features: {
            neuroSeoQueries: 500,
            competitors: 25,
            users: 5,
            support: 'priority'
        }
    },
    enterprise: {
        name: 'Enterprise Tier',
        price: 299,
        priceId: 'price_1RqGKB2fkoCQ0GTpwGQlzI4e', // ← NEW REAL PRICE ID
        features: {
            neuroSeoQueries: -1, // Unlimited
            competitors: -1, // Unlimited
            users: -1, // Unlimited
            support: 'dedicated'
        }
    }
};

// Create Checkout Session for RankPilot
export async function createCheckoutSession(
    userId: string,
    tier: keyof typeof RANKPILOT_TIERS,
    userEmail: string,
    successUrl: string,
    cancelUrl: string
) {
    const tierConfig = RANKPILOT_TIERS[tier];

    if (!tierConfig.priceId) {
        throw new Error(`${tier} tier does not require Stripe checkout`);
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price: tierConfig.priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        customer_email: userEmail,
        client_reference_id: userId,
        metadata: {
            userId,
            tier,
            platform: 'rankpilot'
        },
        subscription_data: {
            trial_period_days: tier === 'starter' ? 14 : tier === 'agency' ? 14 : 30,
            metadata: {
                userId,
                tier,
                features: JSON.stringify(tierConfig.features)
            }
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        tax_id_collection: {
            enabled: true
        }
    });

    return session;
}

// Handle successful subscription creation
export async function handleSubscriptionSuccess(sessionId: string) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
    });

    const subscription = session.subscription as Stripe.Subscription;
    const customer = session.customer as Stripe.Customer;

    return {
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: subscription.status,
        currentPeriodEnd: ((subscription as unknown as StripeSubLike).current_period_end ?? 0) * 1000,
        userId: session.client_reference_id,
        tier: session.metadata?.tier,
        trialEnd: (subscription as unknown as StripeSubLike).trial_end
            ? (subscription as unknown as StripeSubLike).trial_end! * 1000
            : null
    };
}

// Upgrade/Downgrade subscription
export async function updateSubscription(
    subscriptionId: string,
    newTier: keyof typeof RANKPILOT_TIERS
) {
    const tierConfig = RANKPILOT_TIERS[newTier];

    if (!tierConfig.priceId) {
        throw new Error('Cannot update to free tier via Stripe');
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return await stripe.subscriptions.update(subscriptionId, {
        items: [
            {
                id: subscription.items.data[0].id,
                price: tierConfig.priceId,
            },
        ],
        proration_behavior: 'create_prorations',
        metadata: {
            tier: newTier,
            features: JSON.stringify(tierConfig.features)
        }
    });
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, immediately = false) {
    if (immediately) {
        const stripe = getStripe();
        return await stripe.subscriptions.cancel(subscriptionId);
    } else {
        const stripe = getStripe();
        return await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });
    }
}

// Get customer portal URL for self-service
export async function createCustomerPortalSession(
    customerId: string,
    returnUrl: string
) {
    const stripe = getStripe();
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}
