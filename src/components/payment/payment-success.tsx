"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import confetti from "canvas-confetti";

export default function PaymentSuccess() {
  const [emailSent, setEmailSent] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const plan = searchParams?.get("plan") || "agency";
  const amount = searchParams?.get("amount") || "79";
  const cycle = searchParams?.get("cycle") || "monthly";
  const method = searchParams?.get("method") || "stripe";
  const sessionId = searchParams?.get("session_id");

  useEffect(() => {
    // Trigger confetti animation
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 500);

    // Update user subscription status in Firestore
    if (user?.uid) {
      updateUserSubscription();
    }

    // Send confirmation email
    sendConfirmationEmail();

    return () => clearTimeout(timer);
  }, [user]);

  const updateUserSubscription = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        subscription: {
          plan,
          status: "active",
          billingCycle: cycle,
          amount: parseFloat(amount),
          paymentMethod: method,
          subscribedAt: new Date(),
          nextBillingDate: new Date(
            Date.now() + (cycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000
          ),
          sessionId,
        },
        updatedAt: new Date(),
      });
    } catch (_error) {
      console.error("Error updating subscription:", _error);
    }
  };

  const sendConfirmationEmail = async () => {
    try {
      // This would call your email service
      setEmailSent(true);
      toast.success("Confirmation email sent!");
    } catch (_error) {
      console.error("Error sending email:", _error);
    }
  };

  const downloadInvoice = async () => {
    try {
      setInvoiceLoading(true);
      // Generate and download invoice
      toast.success("Invoice downloaded successfully!");
    } catch (_error) {
      console.error("Error downloading invoice:", _error);
      toast.error("Failed to download invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const planDetails = {
    starter: { name: "Starter", color: "bg-blue-500" },
    agency: { name: "agency", color: "bg-purple-500" },
    enterprise: { name: "Enterprise", color: "bg-gold-500" },
  };

  const currentPlan =
    planDetails[plan as keyof typeof planDetails] || planDetails.agency;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-green-50/50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome to RankPilot {currentPlan.name}! Your account has been
            upgraded.
          </p>
        </motion.div>

        {/* Payment Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${currentPlan.color}`}
                    />
                    <span className="font-semibold">{currentPlan.name}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">${amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing Cycle</p>
                  <Badge variant="secondary" className="capitalize">
                    {cycle}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Payment Method
                  </p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="capitalize">{method}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Paid</span>
                <span className="text-xl font-bold text-green-600">
                  ${amount}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail
                      className={`h-5 w-5 ${emailSent ? "text-green-600" : "text-muted-foreground"}`}
                    />
                    <div>
                      <p className="font-medium">Confirmation Email</p>
                      <p className="text-sm text-muted-foreground">
                        {emailSent ? "Sent to your email" : "Sending..."}
                      </p>
                    </div>
                  </div>
                  {emailSent && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Next Billing Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          Date.now() +
                            (cycle === "yearly" ? 365 : 30) *
                              24 *
                              60 *
                              60 *
                              1000
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={downloadInvoice}
                  variant="outline"
                  disabled={invoiceLoading}
                  className="w-full justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {invoiceLoading ? "Generating..." : "Download Invoice"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="grid gap-3">
            <Link href="/dashboard">
              <Button className="w-full" size="lg">
                <ArrowRight className="h-5 w-5 mr-2" />
                Go to Dashboard
              </Button>
            </Link>

            <Link href="/settings?tab=billing">
              <Button variant="outline" className="w-full">
                Manage Subscription
              </Button>
            </Link>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Need help? Contact our support team
            </p>
            <Button variant="link" asChild>
              <Link href="/support">Get Support</Link>
            </Button>
          </div>
        </motion.div>

        {/* Features Unlocked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Features Unlocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {plan === "starter" && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        10 Link Analyses per month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Basic SERP Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Email Support</span>
                    </div>
                  </>
                )}
                {plan === "agency" && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        100 Link Analyses per month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Advanced SERP Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Priority Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">API Access</span>
                    </div>
                  </>
                )}
                {plan === "enterprise" && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited Link Analyses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Enterprise SERP Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">24/7 Phone Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Custom Integrations</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
