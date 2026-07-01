"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription, usePlanComparison } from "@/hooks/useSubscription";
import { CheckCircle, Clock, CreditCard, Star, Zap, Crown } from "lucide-react";
import LoadingScreen from "@/components/ui/loading-screen";
import { STRIPE_PLANS } from "@/lib/stripe";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

function BillingPage() {
  const { subscription, loading } = useSubscription();
  const { plans } = usePlanComparison();
  const { toast } = useToast();

  // Real Stripe Checkout: create a session for the tier and redirect to Stripe's hosted page.
  const handleUpgrade = async (planId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken?.();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier: planId, billingInterval: "monthly" }),
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) {
        throw new Error(
          j.error === "Stripe not configured"
            ? "Billing isn't enabled yet — please try again shortly."
            : j.error || "Could not start checkout."
        );
      }
      window.location.href = j.url; // → Stripe Checkout
    } catch (e: unknown) {
      toast({
        title: "Checkout failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const currentPlan = subscription
    ? STRIPE_PLANS[subscription.tier as keyof typeof STRIPE_PLANS]
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and billing information
        </p>
      </div>

      {/* Current Plan Section */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    {subscription?.planName}
                    {subscription?.tier === "starter" && (
                      <Badge variant="default" className="bg-primary">
                        <Zap className="w-3 h-3 mr-1" />
                        Starter
                      </Badge>
                    )}
                    {subscription?.tier === "agency" && (
                      <Badge variant="default" className="bg-warning">
                        <Crown className="w-3 h-3 mr-1" />
                        Agency
                      </Badge>
                    )}
                    {subscription?.tier === "enterprise" && (
                      <Badge variant="default" className="bg-accent">
                        <Crown className="w-3 h-3 mr-1" />
                        Enterprise
                      </Badge>
                    )}
                    {subscription?.tier === "free" && (
                      <Badge variant="outline">Free Plan</Badge>
                    )}
                  </h3>
                  <p className="text-muted-foreground">
                    {subscription?.status === "active" ? (
                      <>
                        Active subscription •{" "}
                        {subscription?.features?.length || 0} features
                      </>
                    ) : (
                      "Free tier with basic features"
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    ${currentPlan?.price?.monthly || 0}
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                  {subscription?.status === "active" &&
                    subscription?.currentPeriodEnd && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Renews{" "}
                        {subscription.currentPeriodEnd.toLocaleDateString()}
                      </p>
                    )}
                  {subscription?.tier === "free" && (
                    <p className="text-sm text-muted-foreground">
                      No billing required
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <h4 className="font-semibold">Plan Features:</h4>
                <ul className="grid md:grid-cols-2 gap-1">
                  {subscription?.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-success-foreground" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {subscription?.tier === "free" && (
                <div className="rounded-lg p-4 border bg-primary/10 border-primary/30">
                  <p className="text-sm text-primary mb-3">
                    <strong>Upgrade to unlock more features:</strong> Get more
                    audits, advanced reports, competitor tracking, and priority
                    support.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/80"
                      onClick={() => handleUpgrade("starter")}
                    >
                      Upgrade to Starter ($19/mo)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpgrade("agency")}
                    >
                      View Agency Plan ($49/mo)
                    </Button>
                  </div>
                </div>
              )}

              {subscription?.tier === "starter" && (
                <div className="rounded-lg p-4 border bg-warning/10 border-warning/30">
                  <p className="text-sm text-warning-foreground mb-3">
                    <strong>Ready for unlimited access?</strong> Upgrade to
                    Agency plan for unlimited audits, white-label reports, and
                    dedicated support.
                  </p>
                  <Button
                    size="sm"
                    className="bg-warning hover:bg-warning/80"
                    onClick={() => handleUpgrade("agency")}
                  >
                    Upgrade to Agency ($49/mo)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Statistics */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Audits Used</span>
                  <span>
                    {subscription?.tier === "free"
                      ? "3"
                      : subscription?.tier === "starter"
                        ? "12"
                        : "47"}{" "}
                    /{" "}
                    {subscription?.isUnlimited
                      ? "∞"
                      : subscription?.planLimits.auditsPerMonth}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: subscription?.isUnlimited
                        ? "20%"
                        : subscription?.tier === "free"
                          ? "60%"
                          : subscription?.tier === "starter"
                            ? "24%"
                            : "47%",
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Keywords Tracked</span>
                  <span>
                    {subscription?.tier === "free"
                      ? "23"
                      : subscription?.tier === "starter"
                        ? "156"
                        : "1,247"}{" "}
                    /{" "}
                    {subscription?.isUnlimited
                      ? "∞"
                      : subscription?.planLimits.keywords}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-success h-2 rounded-full"
                    style={{
                      width: subscription?.isUnlimited
                        ? "30%"
                        : subscription?.tier === "free"
                          ? "46%"
                          : subscription?.tier === "starter"
                            ? "31%"
                            : "85%",
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Reports Generated</span>
                  <span>
                    {subscription?.tier === "free"
                      ? "2"
                      : subscription?.tier === "starter"
                        ? "8"
                        : "23"}{" "}
                    /{" "}
                    {subscription?.isUnlimited
                      ? "∞"
                      : subscription?.planLimits.reports}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-warning h-2 rounded-full"
                    style={{
                      width: subscription?.isUnlimited
                        ? "15%"
                        : subscription?.tier === "free"
                          ? "40%"
                          : subscription?.tier === "starter"
                            ? "16%"
                            : "23%",
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans
            .filter((p) => p.tier !== "free")
            .map((plan) => (
              <Card
                key={plan.tier}
                className={`relative ${plan.tier === subscription?.tier ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {plan.tier === "agency" && (
                      <Crown className="w-5 h-5 text-warning-foreground" />
                    )}
                    {plan.tier === "enterprise" && (
                      <Crown className="w-5 h-5 text-accent" />
                    )}
                    {plan.tier === "starter" && (
                      <Zap className="w-5 h-5 text-primary" />
                    )}
                    <CardTitle className="capitalize">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                  {plan.tier === subscription?.tier && (
                    <Badge variant="default" className="mt-2">
                      Current Plan
                    </Badge>
                  )}
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-success-foreground" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {plan.tier === subscription?.tier ? (
                    <Button disabled className="w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.tier)}
                    >
                      {subscription?.tier === "free" ? "Upgrade" : "Switch"} to{" "}
                      {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Payment History */}
      {subscription?.status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recent billing history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">Starter Plan - Monthly</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(
                      Date.now() - 30 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$19.00</p>
                  <Badge
                    variant="outline"
                    className="text-success-foreground border-success/60"
                  >
                    Paid
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">Starter Plan - Monthly</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(
                      Date.now() - 60 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$19.00</p>
                  <Badge
                    variant="outline"
                    className="text-success-foreground border-success/60"
                  >
                    Paid
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Starter Plan - Monthly</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(
                      Date.now() - 90 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$19.00</p>
                  <Badge
                    variant="outline"
                    className="text-success-foreground border-success/60"
                  >
                    Paid
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BillingPage;
