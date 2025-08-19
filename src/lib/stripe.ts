import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      throw new Error("Stripe publishable key is not configured");
    }

    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export default getStripe;

// Stripe pricing configuration - Standardized 4-tier system
export const STRIPE_PLANS = {
  starter: {
    name: "Starter",
    priceId: {
      monthly: "price_starter_monthly", // Replace with actual Stripe Price IDs
      yearly: "price_starter_yearly",
    },
    price: {
      monthly: 19,
      yearly: 182, // ~20% off
    },
    features: [
      "50 audits/month",
      "50 keyword tracking",
      "5 competitor analysis",
      "Advanced reports",
      "Email support",
      "PDF export",
    ],
    limits: {
      auditsPerMonth: 50,
      keywords: 50,
      reports: 50,
      competitors: 5,
    },
  },
  agency: {
    name: "Agency",
    priceId: {
      monthly: "price_agency_monthly",
      yearly: "price_agency_yearly",
    },
    price: {
      monthly: 49,
      yearly: 470, // ~20% off
    },
    features: [
      "Unlimited audits",
      "Unlimited keyword tracking",
      "Unlimited competitor analysis",
      "White-label reports",
      "Priority support",
      "API access",
      "Team collaboration",
      "Advanced integrations",
    ],
    limits: {
      auditsPerMonth: -1, // unlimited
      keywords: -1,
      reports: -1,
      competitors: -1,
    },
  },
  enterprise: {
    name: "Enterprise",
    priceId: {
      monthly: "price_enterprise_monthly",
      yearly: "price_enterprise_yearly",
    },
    price: {
      monthly: 99,
      yearly: 950, // ~20% off
    },
    features: [
      "Everything in Agency",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone support",
      "Custom solutions",
      "Enterprise SLA",
      "Advanced security",
      "Custom branding",
    ],
    limits: {
      auditsPerMonth: -1, // unlimited
      keywords: -1,
      reports: -1,
      competitors: -1,
    },
  },
} as const;

export const FREE_PLAN = {
  name: "Free",
  price: {
    monthly: 0,
    yearly: 0,
  },
  features: ["5 audits/month", "Basic Reports", "Limited Keywords"],
  limits: {
    auditsPerMonth: 5,
    keywords: 50,
    reports: 5,
    competitors: 1,
  },
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;
export type BillingInterval = "monthly" | "yearly";

/**
 * Get user plan from subscription tier
 */
export function getUserPlan(subscriptionTier: string): PlanType | "free" {
  if (subscriptionTier === "free" || !subscriptionTier) {
    return "free";
  }

  if (subscriptionTier in STRIPE_PLANS) {
    return subscriptionTier as PlanType;
  }

  return "free";
}
