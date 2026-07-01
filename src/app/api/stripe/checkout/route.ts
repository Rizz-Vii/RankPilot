import { adminAuth } from "@/lib/firebase-admin";
import {
  STRIPE_PLANS,
  type BillingInterval,
  type PlanType,
} from "@/lib/stripe";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Use the fetch HTTP client. Node's default http transport throws StripeConnectionError
  // ("connection to Stripe… retried N times") in this Cloud Run / Next.js serverless runtime, while
  // fetch works — the same transport the gemini + self-fetch calls use successfully.
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

export async function POST(request: NextRequest) {
  try {
    const { tier, billingInterval, successUrl, cancelUrl } =
      (await request.json()) as {
        tier: PlanType | "free";
        billingInterval?: BillingInterval;
        successUrl?: string;
        cancelUrl?: string;
      };

    if (!tier) {
      return NextResponse.json(
        { error: "Subscription tier is required" },
        { status: 400 }
      );
    }
    if (tier === "free") {
      return NextResponse.json(
        { error: "Free tier does not require payment" },
        { status: 400 }
      );
    }
    if (!(tier in STRIPE_PLANS)) {
      return NextResponse.json(
        { error: "Invalid subscription tier" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const plan = STRIPE_PLANS[tier as PlanType];
    const interval: BillingInterval = billingInterval || "monthly";
    const priceId = plan.priceId?.[interval];
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for tier/interval" },
        { status: 400 }
      );
    }

    // Try to infer userId from Authorization if present (Bearer Firebase ID token)
    let userId: string | undefined;
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        // ignore; allow anonymous creation with no userId
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        (successUrl || `${appUrl}/payment-success`) +
        "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl || `${appUrl}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        planId: tier,
        billingInterval: interval,
        ...(userId ? { userId } : {}),
      },
      subscription_data: {
        metadata: {
          planId: tier,
          billingInterval: interval,
          ...(userId ? { userId } : {}),
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// Handle checkout session retrieval
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    // Retrieve session details from Stripe
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      sessionId,
      status: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_email,
      paymentIntent: session.payment_intent,
      subscription: session.subscription,
    });
  } catch (error: unknown) {
    console.error("❌ Checkout retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve checkout session" },
      { status: 500 }
    );
  }
}
