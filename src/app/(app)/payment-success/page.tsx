"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Download,
  Mail,
  Calendar,
  CreditCard,
  ArrowRight,
  Receipt,
  Star,
  Rocket,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import confetti from "canvas-confetti";

// Simple loading component
const LoadingScreen = ({
  fullScreen,
  text,
}: {
  fullScreen?: boolean;
  text?: string;
}) => (
  <div
    className={`flex items-center justify-center ${fullScreen ? "min-h-screen" : "h-64"}`}
  >
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">{text || "Loading..."}</p>
    </div>
  </div>
);

export default function PaymentSuccess() {
  const [emailSent, setEmailSent] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const plan = searchParams?.get("plan") || "agency";
  const amount = searchParams?.get("amount") || "79";
  const cycle = searchParams?.get("cycle") || "monthly";
  const method = searchParams?.get("method") || "stripe";
  const sessionId = searchParams?.get("session_id");

  // Create paymentData object from search params
  const paymentData = {
    plan: plan,
    amount: parseFloat(amount),
    billingCycle: cycle,
    paymentMethod: method,
    transactionId: sessionId || `tx_${Date.now()}`,
    nextBillingDate: new Date(
      Date.now() + (cycle === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    invoiceUrl: `/invoice/${sessionId || "pending"}`,
  };

  const nextSteps = [
    {
      icon: <Rocket className="h-5 w-5" />,
      title: "Complete Your Profile",
      description: "Set up your company information and preferences",
      href: "/settings",
      priority: "high",
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: "Start Your First Project",
      description: "Create your first SEO project and add keywords",
      href: "/dashboard",
      priority: "high",
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: "Connect Your Tools",
      description: "Integrate with Google Analytics, Search Console, and more",
      href: "/integrations",
      priority: "medium",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Schedule Your First Audit",
      description: "Run a comprehensive SEO audit of your website",
      href: "/seo-audit",
      priority: "medium",
    },
  ];

  const features = [
    "Advanced keyword tracking and ranking monitoring",
    "Competitor analysis and SERP insights",
    "AI-powered content brief generation",
    "Comprehensive SEO audit reports",
    "Priority email and chat support",
    "White-label reporting options",
    "API access for custom integrations",
    "Weekly performance reports",
  ];

  useEffect(() => {
    // Simulate loading payment confirmation
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowConfetti(true);

      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen fullScreen text="Confirming your payment..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {/* Confetti effect will be triggered by the useEffect */}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-6"
          >
            <CheckCircle className="h-10 w-10" />
          </motion.div>

          <h1 className="text-4xl font-bold font-headline mb-4">
            Welcome to RankPilot!
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Your payment was successful and your {paymentData.plan} plan is now
            active.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary" className="px-4 py-2">
              Transaction ID: {paymentData.transactionId}
            </Badge>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Payment Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-semibold">{paymentData.plan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">${paymentData.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Billing Cycle:</span>
                  <span className="capitalize">{paymentData.billingCycle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span>{paymentData.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Next Billing:</span>
                  <span>{paymentData.nextBillingDate}</span>
                </div>

                <div className="pt-4 space-y-3">
                  <Button asChild className="w-full">
                    <Link href={paymentData.invoiceUrl}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/settings?tab=billing">
                      View Billing Dashboard
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* What's Included */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  What's Included
                </CardTitle>
                <CardDescription>
                  Your {paymentData.plan} plan includes all these features:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle className="h-4 w-4 text-success-foreground flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">
                Get Started in 4 Easy Steps
              </CardTitle>
              <CardDescription>
                Complete these steps to maximize your SEO success with RankPilot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {nextSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <Card
                      className={`h-full transition-all duration-300 hover:shadow-lg ${step.priority === "high" ? "border-primary/50" : ""}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-2 rounded-lg ${step.priority === "high" ? "bg-primary/10 text-primary" : "bg-muted"}`}
                          >
                            {step.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{step.title}</h3>
                              {step.priority === "high" && (
                                <Badge variant="outline" className="text-xs">
                                  Priority
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              {step.description}
                            </p>
                            <Button
                              asChild
                              size="sm"
                              variant={
                                step.priority === "high" ? "default" : "outline"
                              }
                            >
                              <Link href={step.href}>
                                Get Started
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">
                Ready to Boost Your Rankings?
              </h2>
              <p className="text-muted-foreground mb-6">
                Jump straight into your dashboard and start tracking your first
                keywords today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    <Rocket className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact">
                    <Mail className="h-4 w-4 mr-2" />
                    Get Help
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground">
            Need help getting started? Our support team is here to help you
            succeed.{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us anytime
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

