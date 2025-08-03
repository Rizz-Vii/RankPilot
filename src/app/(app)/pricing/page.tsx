"use client";

import React, { useState } from "react";
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
import {
  Check,
  Crown,
  Zap,
  Shield,
  CreditCard,
  Star,
  TrendingUp,
  Users,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { trackPaymentEvents, conversionFunnel } from "@/lib/analytics";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    yearlyPrice: 290,
    description: "Perfect for individuals getting started with SEO",
    icon: <Rocket className="h-6 w-6" />,
    badge: null,
    features: [
      "50 keyword tracking",
      "5 competitor analysis",
      "Basic SEO audit",
      "Content suggestions",
      "Email support",
      "Monthly reports",
    ],
    limitations: [
      "Limited to 3 websites",
      "50 backlink checks/month",
      "Basic analytics",
    ],
  },
  {
    id: "agency",
    name: "agency",
    price: 79,
    yearlyPrice: 790,
    description: "Ideal for agencies and growing businesses",
    icon: <TrendingUp className="h-6 w-6" />,
    badge: { text: "Most Popular", variant: "default" as const },
    features: [
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
    limitations: ["Up to 25 websites", "500 backlink checks/month"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    yearlyPrice: 1990,
    description: "For large agencies and enterprise teams",
    icon: <Crown className="h-6 w-6" />,
    badge: { text: "Best Value", variant: "secondary" as const },
    features: [
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
    limitations: ["Unlimited websites", "Unlimited backlink checks"],
  },
];

const features = [
  {
    category: "SEO Tools",
    items: [
      {
        name: "Keyword Research & Tracking",
        starter: "50 keywords",
        pro: "500 keywords",
        enterprise: "Unlimited",
      },
      {
        name: "Competitor Analysis",
        starter: "5 competitors",
        pro: "25 competitors",
        enterprise: "Unlimited",
      },
      {
        name: "SEO Audit & Health Check",
        starter: "Basic",
        pro: "Advanced",
        enterprise: "Premium",
      },
      {
        name: "Backlink Analysis",
        starter: "50/month",
        pro: "500/month",
        enterprise: "Unlimited",
      },
      {
        name: "Content Brief Generator",
        starter: "Basic",
        pro: "AI-Powered",
        enterprise: "Advanced AI",
      },
    ],
  },
  {
    category: "Reporting & Analytics",
    items: [
      {
        name: "Report Frequency",
        starter: "Monthly",
        pro: "Weekly",
        enterprise: "Real-time",
      },
      {
        name: "Data Export",
        starter: "CSV",
        pro: "CSV, PDF",
        enterprise: "All formats",
      },
      {
        name: "Custom Dashboards",
        starter: "❌",
        pro: "✅",
        enterprise: "✅ Advanced",
      },
      {
        name: "White-label Reports",
        starter: "❌",
        pro: "Basic",
        enterprise: "Complete",
      },
    ],
  },
  {
    category: "Support & Integrations",
    items: [
      {
        name: "Support Channel",
        starter: "Email",
        pro: "Priority Email",
        enterprise: "24/7 Phone",
      },
      {
        name: "API Access",
        starter: "❌",
        pro: "Standard",
        enterprise: "Premium",
      },
      {
        name: "Team Collaboration",
        starter: "1 user",
        pro: "5 users",
        enterprise: "Unlimited",
      },
      {
        name: "Account Manager",
        starter: "❌",
        pro: "❌",
        enterprise: "Dedicated",
      },
    ],
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();

  // Track pricing page view on mount
  React.useEffect(() => {
    trackPaymentEvents.viewPricing();
    conversionFunnel.step(1, "pricing_view");
  }, []);

  const handlePlanSelection = (planId: string, planPrice: number) => {
    // Track plan selection
    trackPaymentEvents.beginCheckout(planId, planPrice);
    conversionFunnel.step(2, "plan_selected", planId, {
      billingCycle: isYearly ? "yearly" : "monthly",
      price: planPrice,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold font-headline">
              Simple, Transparent Pricing
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose the perfect plan for your SEO needs. No hidden fees, cancel
            anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span
              className={`text-sm ${!isYearly ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isYearly ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isYearly ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm ${isYearly ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              Yearly
            </span>
            <Badge variant="secondary" className="ml-2">
              Save 20%
            </Badge>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge variant={plan.badge.variant} className="px-4 py-1">
                    {plan.badge.text}
                  </Badge>
                </div>
              )}

              <Card
                className={`h-full ${plan.badge ? "border-primary shadow-lg scale-105" : ""} hover:shadow-xl transition-all duration-300`}
              >
                <CardHeader className="text-center pb-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {plan.icon}
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        ${isYearly ? plan.yearlyPrice : plan.price}
                      </span>
                      <span className="text-muted-foreground">
                        /{isYearly ? "year" : "month"}
                      </span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-green-600 font-medium">
                        Save ${plan.price * 12 - plan.yearlyPrice} annually
                      </p>
                    )}
                  </div>

                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-success-foreground flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    className="w-full"
                    variant={plan.badge ? "default" : "outline"}
                    size="lg"
                    onClick={() =>
                      handlePlanSelection(
                        plan.id,
                        isYearly ? plan.yearlyPrice : plan.price
                      )
                    }
                  >
                    <Link
                      href={`/checkout?plan=${plan.id}&billing=${isYearly ? "yearly" : "monthly"}`}
                    >
                      {user
                        ? "Upgrade to " + plan.name
                        : "Start " + plan.name + " Plan"}
                    </Link>
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    No setup fees • Cancel anytime
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">
                Detailed Feature Comparison
              </CardTitle>
              <CardDescription>
                See exactly what's included in each plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Features</th>
                      <th className="text-center p-4 font-medium">Starter</th>
                      <th className="text-center p-4 font-medium">agency</th>
                      <th className="text-center p-4 font-medium">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((category) => (
                      <React.Fragment key={category.category}>
                        <tr className="bg-muted/50">
                          <td
                            colSpan={4}
                            className="p-4 font-semibold text-sm uppercase tracking-wide"
                          >
                            {category.category}
                          </td>
                        </tr>
                        {category.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted">
                            <td className="p-4">{item.name}</td>
                            <td className="p-4 text-center text-sm">
                              {item.starter}
                            </td>
                            <td className="p-4 text-center text-sm">
                              {item.pro}
                            </td>
                            <td className="p-4 text-center text-sm">
                              {item.enterprise}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <h2 className="text-2xl font-bold mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I change my plan later?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time.
                  Changes take effect immediately and we'll prorate any billing
                  differences.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What payment methods do you accept?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards, PayPal, and bank transfers
                  for enterprise customers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Is there a free trial?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! All plans come with a 14-day free trial. No credit card
                  required to start.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need a custom plan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Contact our sales team for custom enterprise solutions with
                  dedicated support and custom integrations.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">
                Ready to boost your SEO?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of marketers who trust RankPilot for their SEO
                success.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/register">Start Free Trial</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact">Contact Sales</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

