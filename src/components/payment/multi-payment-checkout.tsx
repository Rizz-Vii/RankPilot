"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingScreen from "@/components/ui/loading-screen";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { conversionFunnel, trackPaymentEvents } from "@/lib/analytics";
import { functions } from "@/lib/firebase";
import { asVoidHandler } from "@/lib/react/handlers";
import getStripe, { STRIPE_PLANS } from "@/lib/stripe";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { httpsCallable } from "firebase/functions";
import { motion } from "framer-motion";
import { Check, CreditCard, Lock, Shield, Star, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
const createPayPalOrder = httpsCallable(functions, "createPayPalOrder");

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
    icon: <span className="text-primary font-bold text-sm">PayPal</span>,
    supported: ["paypal", "pay_later"],
    popular: true,
  },
];

export default function MultiPaymentCheckout(): JSX.Element {
  const [selectedMethod, setSelectedMethod] = useState<string>("stripe");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const planId = searchParams?.get("plan") || "agency";
  const billingInterval = searchParams?.get("interval") || "monthly";

  const plan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
  const price =
    plan && typeof plan.price === "object"
      ? (plan.price[billingInterval as "monthly" | "yearly"] ?? 0)
      : 0;
  const savings =
    billingInterval === "yearly" && plan && typeof plan.price === "object"
      ? Number(plan.price.monthly ?? 0) * 12 - Number(plan.price.yearly ?? 0)
      : 0;

  useEffect(() => {
    setIsMounted(true);

    // Track checkout page view
    trackPaymentEvents.beginCheckout(planId, price || 0);
    conversionFunnel.step(2, "checkout_view", planId);
  }, [planId, price]);

  const handleStripeCheckout = async (): Promise<void> => {
    try {
      setIsProcessing(true);

      // Track payment method selection
      trackPaymentEvents.selectPaymentMethod("stripe", planId);
      conversionFunnel.step(3, "payment_method_selected", planId, {
        method: "stripe",
      });

      const result = await createCheckoutSession({
        userId: user?.uid,
        priceId: plan?.priceId[billingInterval as "monthly" | "yearly"],
        plan: planId,
        interval: billingInterval,
        successUrl: `${window.location.origin}/payment-success?plan=${planId}&amount=${price}&cycle=${billingInterval}`,
        cancelUrl: `${window.location.origin}/pricing`,
      });
      const data = result.data as unknown;
      const sessionId =
        data && typeof data === "object" && "sessionId" in data
          ? (data as { sessionId: string }).sessionId
          : undefined;
      if (!sessionId) throw new Error("Missing sessionId");

      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe not loaded");

      // Track checkout initiation
      conversionFunnel.step(4, "stripe_redirect", planId);

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error("Stripe checkout error:", error);
        trackPaymentEvents.abandonCheckout(
          planId,
          "stripe_redirect",
          error.message
        );
        toast.error("Payment failed. Please try again.");
      }
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || "Unknown error";
      console.error("Checkout error:", error);
      trackPaymentEvents.abandonCheckout(
        planId,
        "checkout_session_creation",
        msg
      );
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  interface PayPalApproveData {
    orderID?: string;
  }
  const handlePayPalApprove = async (
    data: PayPalApproveData
  ): Promise<void> => {
    try {
      setIsProcessing(true);

      // Track successful PayPal payment
      trackPaymentEvents.purchase(
        planId,
        price || 0,
        data?.orderID || "unknown",
        "USD"
      );
      conversionFunnel.step(5, "payment_completed", planId, {
        method: "paypal",
      });

      // Handle PayPal payment approval
      router.push(
        `/payment-success?plan=${planId}&amount=${price}&cycle=${billingInterval}&method=paypal`
      );
      toast.success("Payment successful!");
    } catch (error) {
      console.error("PayPal payment error:", error);
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
                        <p className="text-sm text-success">Save ${savings}</p>
                      )}
                    </div>
                  </div>

                  {billingInterval === "yearly" && savings > 0 && (
                    <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-success">
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

                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-primary">
                      <p className="font-medium">Secure & Protected</p>
                      <p className="text-primary">
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
                        onClick={asVoidHandler(handleStripeCheckout)}
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
                              const result = await createPayPalOrder({
                                userId: user?.uid || "",
                                plan: planId,
                                interval: billingInterval,
                                amount: price,
                              });
                              const data = result.data as unknown;
                              const orderID =
                                data &&
                                typeof data === "object" &&
                                "orderID" in data
                                  ? (data as { orderID: string }).orderID
                                  : undefined;
                              if (!orderID) throw new Error("Missing orderID");
                              return orderID;
                            } catch (error: unknown) {
                              const msg =
                                (error as { message?: string })?.message ||
                                "PayPal order creation failed";
                              console.error(
                                "PayPal order creation error:",
                                error
                              );
                              toast.error("Failed to create PayPal order");
                              throw new Error(msg);
                            }
                          }}
                          onApprove={async (data: unknown) => {
                            await handlePayPalApprove(
                              data as PayPalApproveData
                            );
                            return;
                          }}
                          onError={(error: unknown) => {
                            const msg =
                              (error as { message?: string })?.message ||
                              "PayPal error";
                            console.error("PayPal error:", error);
                            toast.error("PayPal payment failed");
                            trackPaymentEvents.abandonCheckout(
                              planId,
                              "paypal_error",
                              msg
                            );
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
