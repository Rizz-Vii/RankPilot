import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// No global options here; use index.ts for setGlobalOptions
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import {
  getPriceId,
  type BillingInterval,
  type PlanType,
} from "./lib/billing/tiers.js";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

// Region is controlled globally in index.ts or per-function

// Lazy initialization of Stripe to avoid deployment issues
let stripe: Stripe;
function getStripe(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    // Stripe types lag newest apiVersion; use latest supported pinned version
    stripe = new Stripe(secretKey, {} as Stripe.StripeConfig); // Use default API version to satisfy type narrowing
  }
  return stripe;
}

const db = getFirestore();

// Create Checkout Session
export const createCheckoutSession = onRequest(
  { cors: true, secrets: ["STRIPE_SECRET_KEY"], region: "australia-southeast1" },
  async (request, response) => {
    try {
  const { planId, billingInterval, userId } = request.body as {
    planId?: PlanType;
    billingInterval?: BillingInterval;
    userId?: string;
  };

      if (!planId || !billingInterval || !userId) {
        response.status(400).json({ error: "Missing required parameters" });
        return;
      }

  const priceId =
    planId && billingInterval ? getPriceId(planId, billingInterval) : null;
      if (!priceId) {
        response
          .status(400)
          .json({ error: "Invalid plan or billing interval" });
        return;
      }

      // Get user email from Firestore
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData?.email) {
        response.status(404).json({ error: "User not found" });
        return;
      }

      const session = await getStripe().checkout.sessions.create({
        customer_email: userData.email,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
        metadata: {
          userId,
          planId,
          billingInterval,
        },
        subscription_data: {
          metadata: {
            userId,
            planId,
            billingInterval,
          },
        },
      });

      response.json({ sessionId: session.id });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      response.status(500).json({ error: "Internal server error" });
    }
  }
);

// Handle Stripe Webhooks

// Create Customer Portal Session
export const createPortalSession = onRequest(
  { cors: true, secrets: ["STRIPE_SECRET_KEY"], region: "australia-southeast1" },
  async (request, response) => {
    try {
      const { userId } = request.body;

      if (!userId) {
        response.status(400).json({ error: "Missing userId" });
        return;
      }

      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData?.stripeCustomerId) {
        response.status(404).json({ error: "No subscription found" });
        return;
      }

      const session = await getStripe().billingPortal.sessions.create({
        customer: userData.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
      });

      response.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      response.status(500).json({ error: "Internal server error" });
    }
  }
);
