/**
 * Billing tiers — Stripe Price ID resolution.
 *
 * IMPORTANT: Stripe Price IDs are NOT hard-coded here. They are read from
 * environment variables / Firebase secrets so the same code works across
 * test and live Stripe accounts without code changes. Configure them in the
 * Functions environment (or Secret Manager), one per plan + interval, e.g.:
 *
 *   STRIPE_PRICE_STARTER_MONTHLY=price_xxx
 *   STRIPE_PRICE_STARTER_ANNUAL=price_xxx
 *   STRIPE_PRICE_AGENCY_MONTHLY=price_xxx
 *   STRIPE_PRICE_AGENCY_ANNUAL=price_xxx
 *   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
 *   STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxx
 *
 * The "free" plan has no Stripe price. getPriceId() returns null when the
 * plan is free/unknown or the corresponding env var is not configured.
 */

export type PlanType = "free" | "starter" | "agency" | "enterprise";
export type BillingInterval = "monthly" | "annual";

const PAID_PLANS: readonly PlanType[] = ["starter", "agency", "enterprise"];

/**
 * Normalize common interval spellings ("month", "year", "yearly", …) to the
 * canonical BillingInterval so callers can pass whatever the client sends.
 */
function normalizeInterval(interval: string): BillingInterval | null {
  const v = String(interval || "").toLowerCase();
  if (v === "monthly" || v === "month" || v === "mo") return "monthly";
  if (
    v === "annual" ||
    v === "annually" ||
    v === "yearly" ||
    v === "year" ||
    v === "yr"
  )
    return "annual";
  return null;
}

/**
 * Resolve the configured Stripe Price ID for a plan + billing interval.
 * Returns null for the free plan, unknown plan/interval, or when the matching
 * STRIPE_PRICE_<PLAN>_<INTERVAL> env var is not set.
 */
export function getPriceId(
  plan: PlanType,
  interval: BillingInterval
): string | null {
  if (!PAID_PLANS.includes(plan)) return null;
  const normalized = normalizeInterval(interval);
  if (!normalized) return null;
  const envKey = `STRIPE_PRICE_${plan.toUpperCase()}_${normalized.toUpperCase()}`;
  const priceId = process.env[envKey];
  return priceId && priceId.trim() ? priceId.trim() : null;
}

/** All paid plan types (excludes "free"). */
export function getPaidPlans(): PlanType[] {
  return [...PAID_PLANS];
}

/** Type guard for PlanType. */
export function isPlanType(value: unknown): value is PlanType {
  return (
    value === "free" ||
    value === "starter" ||
    value === "agency" ||
    value === "enterprise"
  );
}
