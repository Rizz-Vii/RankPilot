import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
// Re-export unified plans from single source of truth
export { FREE_PLAN, STRIPE_PLANS, type BillingInterval, type PlanType } from './stripe/tiers';

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  // Use explicit null comparison to avoid truthiness check on a Promise (lint: no-misused-promises)
  if (stripePromise === null) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      throw new Error("Stripe publishable key is not configured");
    }

    stripePromise = loadStripe(publishableKey);
  }
  // Return the promise (may still be pending); callers must await
  return stripePromise as Promise<Stripe | null>;
};

export default getStripe;

