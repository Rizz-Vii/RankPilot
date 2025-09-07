import { getLogger } from "@/lib/logging/app-logger";
import { z } from "zod";

const logger = getLogger("stripe.tiers");

export type BillingInterval = "monthly" | "yearly";
export type PlanType = "starter" | "agency" | "enterprise";

// Environment-backed price ID loader with safe fallback to placeholders
function envOr(name: string, fallback: string | null): string | null {
  const v = process.env[name];
  if (typeof v === "string" && v.trim()) return v.trim();
  return fallback;
}

// Free plan (no Stripe price)
export const FREE_PLAN = Object.freeze({
  name: "Free",
  price: { monthly: 0, yearly: 0 },
  features: ["5 audits/month", "Basic Reports", "Limited Keywords"] as const,
  limits: {
    auditsPerMonth: 5,
    keywords: 50,
    reports: 5,
    competitors: 1,
  },
});

/**
 * Single source of truth for paid tiers. Price IDs read from env when available.
 * Required env keys (recommended):
 * - STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_STARTER_YEARLY
 * - STRIPE_PRICE_AGENCY_MONTHLY, STRIPE_PRICE_AGENCY_YEARLY
 * - STRIPE_PRICE_ENTERPRISE_MONTHLY, STRIPE_PRICE_ENTERPRISE_YEARLY
 */
export const STRIPE_PLANS = Object.freeze({
  starter: {
    name: "Starter",
    priceId: {
      monthly: envOr("STRIPE_PRICE_STARTER_MONTHLY", "price_starter_monthly"),
      yearly: envOr("STRIPE_PRICE_STARTER_YEARLY", "price_starter_yearly"),
    },
    price: { monthly: 29, yearly: 290 },
    features: [
      "100 audits/month",
      "100 keyword tracking",
      "5 competitor analysis",
      "Advanced reports",
      "Email support",
      "PDF export",
    ],
    limits: {
      auditsPerMonth: 100,
      keywords: 100,
      reports: 100,
      competitors: 5,
    },
  },
  agency: {
    name: "Agency",
    priceId: {
      monthly: envOr("STRIPE_PRICE_AGENCY_MONTHLY", "price_agency_monthly"),
      yearly: envOr("STRIPE_PRICE_AGENCY_YEARLY", "price_agency_yearly"),
    },
    price: { monthly: 99, yearly: 990 },
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
      auditsPerMonth: -1,
      keywords: -1,
      reports: -1,
      competitors: -1,
    },
  },
  enterprise: {
    name: "Enterprise",
    priceId: {
      monthly: envOr(
        "STRIPE_PRICE_ENTERPRISE_MONTHLY",
        "price_enterprise_monthly"
      ),
      yearly: envOr(
        "STRIPE_PRICE_ENTERPRISE_YEARLY",
        "price_enterprise_yearly"
      ),
    },
    price: { monthly: 299, yearly: 2990 },
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
      auditsPerMonth: -1,
      keywords: -1,
      reports: -1,
      competitors: -1,
    },
  },
} as const);

// Runtime validation (warns for missing IDs; does not throw in dev)
const PriceIdSchema = z.object({
  monthly: z.string().nullable(),
  yearly: z.string().nullable(),
});
const PlanSchema = z.object({
  name: z.string(),
  priceId: PriceIdSchema,
  price: z.object({ monthly: z.number(), yearly: z.number() }),
  features: z.array(z.string()),
  limits: z.object({
    auditsPerMonth: z.number(),
    keywords: z.number(),
    reports: z.number(),
    competitors: z.number(),
  }),
});
const TiersSchema = z.object({
  starter: PlanSchema,
  agency: PlanSchema,
  enterprise: PlanSchema,
});

(() => {
  const parsed = TiersSchema.safeParse(STRIPE_PLANS);
  if (!parsed.success) {
    logger.warn("stripe.tiers.validation_failed", {
      issues: parsed.error.issues,
    });
  }
  // Evidence-like log: which price IDs are active (no secret values beyond ID strings)
  const ids = Object.fromEntries(
    Object.entries(STRIPE_PLANS).map(([k, v]) => [k, v.priceId])
  );
  logger.info("stripe.tiers.loaded", { ids });
})();

export function getPriceId(
  tier: PlanType,
  interval: BillingInterval = "monthly"
): string | null {
  return STRIPE_PLANS[tier].priceId[interval] || null;
}
