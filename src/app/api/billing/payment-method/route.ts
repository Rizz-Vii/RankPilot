import { fetchDefaultCard } from "@/lib/billing/payment-method";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getLogger } from "@/lib/logging/app-logger";
import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const logger = getLogger("billing-payment-method");
const stripeKey = process.env.STRIPE_SECRET_KEY;
// Use account default API version to avoid literal drift with SDK typings
// Fetch HTTP client: Node's default transport throws StripeConnectionError in Cloud Run.
const stripe = stripeKey
  ? new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() })
  : null;

export const GET = withProvenance(
  async function GET(req: Request) {
    const nreq = req;
    const authHeader =
      nreq.headers.get("authorization") || nreq.headers.get("Authorization");
    if (!authHeader) {
      const res = NextResponse.json(
        enforceProvenance(
          { error: "auth_required" },
          { path: "billing/payment-method", note: "auth" }
        ),
        { status: 401 }
      );
      res.headers.set("x-billing-diagnostics", "auth=missing");
      return res;
    }
    try {
      const token = authHeader.replace("Bearer ", "");
      const decoded = await adminAuth.verifyIdToken(token);
      const uid = decoded.uid;
      const userSnap = await adminDb.collection("users").doc(uid).get();
      const userData: { stripeCustomerId?: string } | null = userSnap.exists
        ? (userSnap.data() as { stripeCustomerId?: string })
        : null;
      const customerId = userData?.stripeCustomerId as string | undefined;
      if (!customerId) {
        const res = NextResponse.json(
          enforceProvenance(
            { paymentMethod: null, reason: "no_customer" },
            { path: "billing/payment-method", note: "no_customer" }
          ),
          { status: 200 }
        );
        res.headers.set("x-billing-diagnostics", "auth=ok; customer=missing");
        return res;
      }
      if (!stripe) {
        const res = NextResponse.json(
          enforceProvenance(
            { paymentMethod: null, reason: "stripe_unconfigured" },
            { path: "billing/payment-method", note: "no_stripe" }
          ),
          { status: 200 }
        );
        res.headers.set("x-billing-diagnostics", "auth=ok; stripe=missing");
        return res;
      }
      const pm = await fetchDefaultCard(stripe as Stripe, customerId);
      const res = NextResponse.json(
        enforceProvenance(
          { paymentMethod: pm },
          { path: "billing/payment-method", note: "ok" }
        ),
        { status: 200 }
      );
      res.headers.set(
        "x-billing-diagnostics",
        `auth=ok; method=${pm ? "present" : "none"}`
      );
      return res;
    } catch (e: unknown) {
      logger.error("payment_method.endpoint_error", {
        error: e instanceof Error ? e.message : String(e),
      });
      const res = NextResponse.json(
        enforceProvenance(
          { error: "internal_error" },
          { path: "billing/payment-method", note: "exception" }
        ),
        { status: 500 }
      );
      res.headers.set("x-billing-diagnostics", "auth=unknown; error=exception");
      return res;
    }
  },
  { path: "billing/payment-method" }
);
