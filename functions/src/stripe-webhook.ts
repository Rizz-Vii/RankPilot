import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { upsertFinanceInvoice } from './lib/billing/invoice-upsert';

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
    // Align with supported Stripe API version to satisfy TypeScript definitions
    stripe = new Stripe(secretKey, {} as any);
  }
  return stripe;
}

const db = getFirestore();

/**
 * Stripe Webhook Handler
 * Processes webhook events from Stripe
 */
export const stripeWebhook = onRequest(
  {
    cors: true,
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    region: "australia-southeast2",
  },
  async (req, res) => {
    console.log("🔗 Stripe webhook received");

    if (req.method !== "POST") {
      console.log("❌ Invalid method:", req.method);
      res.status(405).send("Method Not Allowed");
      return;
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.log("❌ Missing signature or webhook secret");
      res.status(400).send("Missing signature or webhook secret");
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log("✅ Webhook signature verified");
    } catch (err) {
      console.log("❌ Webhook signature verification failed:", err);
      res.status(400).send(`Webhook Error: ${err}`);
      return;
    }

    console.log("📨 Processing event:", event.type);

    try {
      // Handle the event
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case "invoice.created": {
          const invoice = event.data.object as Stripe.Invoice;
          await upsertFinanceInvoice(invoice, { allowUnpaid: true });
          break;
        }
        case "invoice.finalized": {
          const invoice = event.data.object as Stripe.Invoice;
          await upsertFinanceInvoice(invoice, { allowUnpaid: true });
          break;
        }
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          await upsertFinanceInvoice(invoice, { allowUnpaid: true });
          await handleInvoicePaymentSucceeded(invoice);
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          await upsertFinanceInvoice(invoice, { allowUnpaid: true });
          await handleInvoicePaymentFailed(invoice);
          break;
        }
        case "customer.subscription.created":
          await handleSubscriptionCreated(
            event.data.object as Stripe.Subscription
          );
          break;
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription
          );
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;
        case "customer.created":
          await handleCustomerCreated(event.data.object as Stripe.Customer);
          break;
        default:
          console.log(`📋 Unhandled event type: ${event.type}`);
      }

      console.log("✅ Event processed successfully");
      res.json({ received: true });
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      res.status(500).send("Webhook processing failed");
    }
  }
);

// Event handlers
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  console.log("💳 Payment succeeded:", paymentIntent.id);

  // Log to Firestore
  await db.collection("payment_events").add({
    type: "payment_succeeded",
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    customerId: paymentIntent.customer,
    timestamp: new Date(),
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("❌ Payment failed:", paymentIntent.id);

  // Log to Firestore
  await db.collection("payment_events").add({
    type: "payment_failed",
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    customerId: paymentIntent.customer,
    failureReason: paymentIntent.last_payment_error?.message,
    timestamp: new Date(),
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("📧 Invoice payment succeeded:", invoice.id);

  // Log to Firestore
  await db.collection("subscription_events").add({
    type: "invoice_payment_succeeded",
    invoiceId: invoice.id,
    subscriptionId: (invoice as any).subscription,
    customerId:
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id,
    amount: invoice.amount_paid,
    timestamp: new Date(),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("❌ Invoice payment failed:", invoice.id);

  // Log to Firestore
  await db.collection("subscription_events").add({
    type: "invoice_payment_failed",
    invoiceId: invoice.id,
    subscriptionId: (invoice as any).subscription,
    customerId:
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id,
    amount: invoice.amount_due,
    timestamp: new Date(),
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("🎉 Subscription created:", subscription.id);

  // Log to Firestore
  await db.collection("subscription_events").add({
    type: "subscription_created",
    subscriptionId: subscription.id,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    status: subscription.status,
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    timestamp: new Date(),
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("📝 Subscription updated:", subscription.id);

  // Log to Firestore
  await db.collection("subscription_events").add({
    type: "subscription_updated",
    subscriptionId: subscription.id,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    status: subscription.status,
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    timestamp: new Date(),
  });
}

// (Refactored) invoice upsert logic centralized in lib/billing/invoice-upsert.ts

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("🗑️ Subscription deleted:", subscription.id);

  // Log to Firestore
  await db.collection("subscription_events").add({
    type: "subscription_deleted",
    subscriptionId: subscription.id,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    status: subscription.status,
    canceledAt: (subscription as any).canceled_at
      ? new Date((subscription as any).canceled_at * 1000)
      : new Date(),
    timestamp: new Date(),
  });
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log("👤 Customer created:", customer.id);

  // Log to Firestore
  await db.collection("customer_events").add({
    type: "customer_created",
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
    timestamp: new Date(),
  });
}
