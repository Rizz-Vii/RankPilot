"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Star, Check, Shield, Zap, Lock } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/ui/loading-screen";
import { toast } from "sonner";
import { STRIPE_PLANS } from "@/lib/stripe";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import getStripe from "@/lib/stripe";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { trackPaymentEvents, conversionFunnel } from "@/lib/analytics";

const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
const createPayPalOrder = httpsCallable(functions, "createPayPalOrder");

interface CheckoutPageProps {}

const paymentMethods = [
  {
    id: "stripe",
    name: "Credit Card",
    description: "Secure payment with Stripe",
    icon: <CreditCard className="h-5 w-5" />,
    supported: ["visa", "mastercard", "amex", "discover"],
    popular: true,
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Pay with PayPal account",
    icon: <span className="text-blue-600 font-bold text-sm">PayPal</span>,
    supported: ["paypal", "pay_later"],
    popular: true,
  },
];

export default function MultiPaymentCheckout() {
  const [selectedMethod, setSelectedMethod] = useState("stripe");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const planId = searchParams?.get("plan") || "agency";
  const billingInterval = searchParams?.get("interval") || "monthly";

  const plan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
  const price = plan?.price[billingInterval as "monthly" | "yearly"];
  const savings =
    billingInterval === "yearly"
      ? plan?.price.monthly * 12 - plan?.price.yearly
      : 0;

  useEffect(() => {
    setIsMounted(true);

    // Track checkout page view
    trackPaymentEvents.beginCheckout(planId, price || 0);
    conversionFunnel.step(2, "checkout_view", planId);
  }, [planId, price]);

  const handleStripeCheckout = async () => {
    try {
      setIsProcessing(true);

      // Track payment method selection
      trackPaymentEvents.selectPaymentMethod("stripe", planId);
      conversionFunnel.step(3, "payment_method_selected", planId, {
        method: "stripe",
      });

      const _result = await createCheckoutSession({
        userId: user?.uid,
        priceId: plan?.priceId[billingInterval as "monthly" | "yearly"],
        plan: planId,
        interval: billingInterval,
        successUrl: `${window.location.origin}/payment-success?plan=${planId}&amount=${price}&cycle=${billingInterval}`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      const { sessionId } = result.data as { sessionId: string };

      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe not loaded");

      // Track checkout initiation
      conversionFunnel.step(4, "stripe_redirect", planId);

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (_error) {
        console.error("Stripe checkout _error:", _error);
        trackPaymentEvents.abandonCheckout(
          planId,
          "stripe_redirect",
          error.message
        );
        toast.error("Payment failed. Please try again.");
      }
    } catch (_error: unknown) {
      console.error("Checkout _error:", _error);
      trackPaymentEvents.abandonCheckout(
        planId,
        "checkout_session_creation",
        error.message
      );
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalApprove = async (_data: unknown, actions: unknown) => {
    try {
      setIsProcessing(true);

      // Track successful PayPal payment
      trackPaymentEvents.purchase(planId, price || 0, data.orderID, "USD");
      conversionFunnel.step(5, "payment_completed", planId, {
        method: "paypal",
      });

      // Handle PayPal payment approval
      router.push(
        `/payment-success?plan=${planId}&amount=${price}&cycle=${billingInterval}&method=paypal`
      );
      toast.success("Payment successful!");
    } catch (_error) {
      console.error("PayPal payment _error:", _error);
      trackPaymentEvents.abandonCheckout(
        planId,
        "paypal_approval",
        "PayPal payment failed"
      );
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !isMounted) {
    return <LoadingScreen fullScreen text="Loading checkout..." />;
  }

  if (!user) {
    router.push(`/login?redirect=${encodeURIComponent(window.location.href)}`);
    return <LoadingScreen fullScreen text="Redirecting to login..." />;
  }

  if (!plan) {
    router.push("/pricing");
    return <LoadingScreen fullScreen text="Invalid plan. Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold font-headline mb-4">
            Complete Your Subscription
          </h1>
          <p className="text-muted-foreground">
            Choose your preferred payment method
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{plan.name} Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        Billed {billingInterval}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${price}</p>
                      {billingInterval === "yearly" && savings > 0 && (
                        <p className="text-sm text-green-600">
                          Save ${savings}
                        </p>
                      )}
                    </div>
                  </div>

                  {billingInterval === "yearly" && savings > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Annual billing saves you ${savings}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${price}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Secure & Protected</p>
                      <p className="text-blue-600">
                        256-bit SSL encryption • Cancel anytime
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  All payments are secure and encrypted
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Method Selection */}
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        trackPaymentEvents.selectPaymentMethod(
                          method.id,
                          planId
                        );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-background rounded">
                            {method.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{method.name}</h4>
                              {method.popular && (
                                <Badge variant="secondary" className="text-xs">
                                  Popular
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            selectedMethod === method.id
                              ? "border-primary bg-primary"
                              : "border-border"
                          }`}
                        >
                          {selectedMethod === method.id && (
                            <div className="w-full h-full rounded-full bg-white scale-50" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Payment Processing */}
                <div className="space-y-4">
                  {selectedMethod === "stripe" && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                          You'll be redirected to Stripe's secure checkout
                        </p>
                      </div>
                      <Button
                        onClick={handleStripeCheckout}
                        disabled={isProcessing}
                        className="w-full"
                        size="lg"
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Pay ${price} with Stripe
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {selectedMethod === "paypal" && (
                    <div className="space-y-4">
                      <PayPalScriptProvider
                        options={{
                          clientId:
                            process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                          currency: "USD",
                          intent: "subscription",
                        }}
                      >
                        <PayPalButtons
                          style={{
                            layout: "vertical",
                            color: "blue",
                            shape: "rect",
                            label: "subscribe",
                          }}
                          createOrder={async () => {
                            try {
                              const _result = await createPayPalOrder({
                                userId: user.uid,
                                plan: planId,
                                interval: billingInterval,
                                amount: price,
                              });
                              return (result.data as any).orderID;
                            } catch (_error) {
                              console.error(
                                "PayPal order creation _error:",
                                _error
                              );
                              toast.error("Failed to create PayPal order");
                              throw error;
                            }
                          }}
                          onApprove={handlePayPalApprove}
                          onError={(_error) => {
                            console.error("PayPal _error:", _error);
                            toast.error("PayPal payment failed");
                          }}
                          disabled={isProcessing}
                        />
                      </PayPalScriptProvider>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    By completing your purchase, you agree to our{" "}
                    <a href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Instant Activation</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
