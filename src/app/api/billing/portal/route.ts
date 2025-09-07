import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getLogger } from "@/lib/logging/app-logger";
import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

// Ensure runtime doesn't attempt to pre-render at build time
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Use account default API version to avoid build-time/type union drift
  return new Stripe(key);
}

export const POST = withProvenance(
  async function POST(req: NextRequest) {
    const logger = getLogger("api.billing.portal");
    try {
      const authHeader =
        req.headers.get("authorization") || req.headers.get("Authorization");
      if (!authHeader) {
        return NextResponse.json(
          enforceProvenance(
            { error: "auth_required" },
            { path: "billing/portal", note: "auth" }
          ),
          { status: 401 }
        );
      }
      const idToken = authHeader.replace("Bearer ", "");
      const decoded = await adminAuth.verifyIdToken(idToken);
      const uid = decoded.uid;

      const userSnap = await adminDb.collection("users").doc(uid).get();
      const user = userSnap.data() as { stripeCustomerId?: string } | undefined;
      const customerId = user?.stripeCustomerId;
      if (!customerId) {
        return NextResponse.json(
          enforceProvenance(
            { error: "no_customer" },
            { path: "billing/portal", note: "no_customer" }
          ),
          { status: 404 }
        );
      }

      const returnUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`
        : undefined;
      const stripe = getStripe();
      if (!stripe) {
        logger.error("billing.portal.misconfigured", {
          reason: "missing_secret_key",
        });
        return NextResponse.json(
          enforceProvenance(
            { error: "stripe_misconfigured" },
            { path: "billing/portal", note: "config" }
          ),
          { status: 500 }
        );
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info("billing.portal.created", { uid });
      return NextResponse.json(
        enforceProvenance(
          { url: session.url },
          { path: "billing/portal", note: "ok" }
        )
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : String(e ?? "internal_error");
      logger.error("billing.portal.error", { error: msg });
      return NextResponse.json(
        enforceProvenance(
          { error: "internal_error" },
          { path: "billing/portal", note: "exception" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "billing/portal" }
);
