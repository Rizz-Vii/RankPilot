"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import getStripe, {
  STRIPE_PLANS,
  PlanType,
  BillingInterval,
} from "@/lib/stripe";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { safeErrorMessage } from "@/lib/utils";

const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const planId = (searchParams?.get("plan") || "agency") as PlanType;
  const billingInterval = (searchParams?.get("billing") ||
    "monthly") as BillingInterval;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push("/login?redirect=/pricing");
    }
  }, [mounted, authLoading, user, router]);

  const plan = planId ? STRIPE_PLANS[planId] : null;

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid Plan</CardTitle>
            <CardDescription>The selected plan was not found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/pricing">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pricing
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCheckout = async () => {
    try {
      setLoading(true);

      // Call Firebase function to create checkout session
      const result = await createCheckoutSession({
        planId,
        billingInterval,
        userId: user.uid,
      });

      const { sessionId } = result.data as { sessionId: string };

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe failed to load");

      await stripe.redirectToCheckout({ sessionId });
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Checkout Failed",
        description: safeErrorMessage(error) || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const price = plan.price[billingInterval];
  const yearlyDiscount =
    billingInterval === "yearly"
      ? plan.price.monthly * 12 - plan.price.yearly
      : 0;

  const features = {
    starter: [
      "50 keyword tracking",
      "5 competitor analysis",
      "Basic SEO audit",
      "Content suggestions",
      "Email support",
      "Monthly reports",
    ],
    agency: [
      "500 keyword tracking",
      "25 competitor analysis",
      "Advanced SEO audit",
      "AI-powered content brief",
      "Priority support",
      "Weekly reports",
      "White-label options",
      "API access",
      "Custom integrations",
    ],
    enterprise: [
      "Unlimited keyword tracking",
      "Unlimited competitor analysis",
      "Premium SEO audit",
      "Advanced AI features",
      "24/7 phone support",
      "Real-time reports",
      "Complete white-labeling",
      "Custom API limits",
      "Dedicated account manager",
      "Custom integrations",
      "Team collaboration tools",
    ],
    admin: [
      "Everything in Enterprise",
      "Unlimited everything",
      "Complete white labeling",
      "Priority support",
      "Custom integrations",
      "Dedicated support team",
      "Custom onboarding",
      "Advanced team management",
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/pricing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pricing
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mb-2">
            Complete Your Subscription
          </h1>
          <p className="text-muted-foreground">
            You're subscribing to the {plan.name} plan. Review your order below.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{plan.name} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Billed {billingInterval}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold">${price}</div>
                  <div className="text-sm text-muted-foreground">
                    /{billingInterval === "monthly" ? "month" : "year"}
                  </div>
                </div>
              </div>

              {billingInterval === "yearly" && yearlyDiscount > 0 && (
                <div className="p-3 rounded-lg border bg-success/10 border-success/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-success-foreground">
                      Annual Discount
                    </span>
                    <span className="text-sm font-bold text-success-foreground">
                      -${yearlyDiscount}
                    </span>
                  </div>
                  <p className="text-xs text-success-foreground/80 mt-1">
                    Save 20% with annual billing
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>
                    ${price}/{billingInterval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Proceed to Payment
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Secure payment powered by Stripe
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cancel anytime • 14-day money-back guarantee
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {plan.name} Plan Features
                <Badge variant="secondary">Popular</Badge>
              </CardTitle>
              <CardDescription>
                Everything included in your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {features[planId].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-success-foreground flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-success-foreground" />
              256-bit SSL encryption
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-success-foreground" />
              Cancel anytime
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-success-foreground" />
              24/7 customer support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
