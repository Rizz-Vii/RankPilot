import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

setGlobalOptions({ region: "australia-southeast2" });

// Lazy initialization of Stripe to avoid deployment issues
let stripe: Stripe;
function getStripe(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripe = new Stripe(secretKey, {
      apiVersion: "2025-06-30.basil",
    });
  }
  return stripe;
}

const db = getFirestore();

// Create Checkout Session
export const createCheckoutSession = onRequest(
  { cors: true, secrets: ["STRIPE_SECRET_KEY"] },
  async (_request, _response) => {
    try {
      const { planId, billingInterval, userId } = request.body;

      if (!planId || !billingInterval || !userId) {
        response.status(400).json({ _error: "Missing required parameters" });
        return;
      }

      // Price mapping - Replace with your actual Stripe Price IDs
      const priceMap: Record<string, Record<string, string>> = {
        starter: {
          monthly: "price_starter_monthly",
          yearly: "price_starter_yearly",
        },
        agency: {
          monthly: "price_agency_monthly",
          yearly: "price_agency_yearly",
        },
      };

      const priceId = priceMap[planId]?.[billingInterval];
      if (!priceId) {
        response
          .status(400)
          .json({ _error: "Invalid plan or billing interval" });
        return;
      }

      // Get user email from Firestore
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData?.email) {
        response.status(404).json({ _error: "User not found" });
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
    } catch (_error) {
      console.error("Error creating checkout session:", _error);
      response.status(500).json({ _error: "Internal server error" });
    }
  }
);

// Handle Stripe Webhooks
export const stripeWebhook = onRequest(
  { cors: true, secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  async (_request, _response) => {
    const sig = request.headers["stripe-signature"];
    let _event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(
        request.rawBody,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: unknown) {
      console.error("Webhook signature verification failed:", err.message);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSubscriptionCreated(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
      }

      response.json({ received: true });
    } catch (_error) {
      console.error("Error processing webhook:", _error);
      response.status(500).json({ _error: "Webhook processing failed" });
    }
  }
);

async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscription = await getStripe().subscriptions.retrieve(
    session.subscription as string
  );
  const customer = await getStripe().customers.retrieve(
    session.customer as string
  );

  // Cast subscription to access current_period_end
  const sub = subscription as any;

  await db
    .collection("users")
    .doc(userId)
    .update({
      subscriptionStatus: "active",
      subscriptionTier: session.metadata?.planId || "agency",
      stripeCustomerId: (customer as Stripe.Customer).id,
      stripeSubscriptionId: subscription.id,
      subscriptionStartDate: new Date(),
      nextBillingDate: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : new Date(),
      updatedAt: new Date(),
    });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Cast subscription to access current_period_end
  const sub = subscription as any;

  await db
    .collection("users")
    .doc(userId)
    .update({
      subscriptionStatus: subscription.status,
      nextBillingDate: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : new Date(),
      updatedAt: new Date(),
    });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await db.collection("users").doc(userId).update({
    subscriptionStatus: "canceled",
    subscriptionEndDate: new Date(),
    updatedAt: new Date(),
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null;
  if (subscriptionId && typeof subscriptionId === "string") {
    const subscription =
      await getStripe().subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      // Cast subscription to access current_period_end
      const sub = subscription as any;

      await db
        .collection("users")
        .doc(userId)
        .update({
          lastPaymentDate: new Date(),
          nextBillingDate: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : new Date(),
          subscriptionStatus: "active",
          updatedAt: new Date(),
        });
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null;
  if (subscriptionId && typeof subscriptionId === "string") {
    const subscription =
      await getStripe().subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      await db.collection("users").doc(userId).update({
        subscriptionStatus: "past_due",
        updatedAt: new Date(),
      });
    }
  }
}

// Create Customer Portal Session
export const createPortalSession = onRequest(
  { cors: true, secrets: ["STRIPE_SECRET_KEY"] },
  async (_request, _response) => {
    try {
      const { userId } = request.body;

      if (!userId) {
        response.status(400).json({ _error: "Missing userId" });
        return;
      }

      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData?.stripeCustomerId) {
        response.status(404).json({ _error: "No subscription found" });
        return;
      }

      const session = await getStripe().billingPortal.sessions.create({
        customer: userData.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
      });

      response.json({ url: session.url });
    } catch (_error) {
      console.error("Error creating portal session:", _error);
      response.status(500).json({ _error: "Internal server error" });
    }
  }
);
