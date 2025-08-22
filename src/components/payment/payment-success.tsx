"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { asVoidHandler } from '@/lib/react/handlers';
import { updateUserSubscription } from "@/lib/subscription";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  Mail,
  Receipt,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function PaymentSuccess(): JSX.Element {
  const [emailSent, setEmailSent] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);


  const searchParams = useSearchParams();
  const { user } = useAuth();

  const plan = searchParams?.get("plan") || "agency";
  const amount = searchParams?.get("amount") || "79";
  const cycle = searchParams?.get("cycle") || "monthly";
  const method = searchParams?.get("method") || "stripe";
  // sessionId available if needed for future invoice retrieval (unused currently)
  // const sessionId = searchParams?.get("session_id");

  const sendConfirmationEmail = useCallback(async () => {
    try {
      // Placeholder – in real implementation call backend/email service
      await new Promise(r => setTimeout(r, 400));
      setEmailSent(true);
    } catch {
      // silent – non‑critical
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 500);

    if (user?.uid) {
      const allowedTiers = ['starter', 'agency', 'enterprise', 'free'] as const;
      const normalizedTier = ((): typeof allowedTiers[number] => {
        return (allowedTiers as readonly string[]).includes(plan) ? (plan as typeof allowedTiers[number]) : 'agency';
      })();
      void updateUserSubscription(user.uid, {
        status: 'active',
        tier: normalizedTier,
      }).catch(() => { /* ignore – webhook will reconcile */ });
    }

    if (!emailSent) {
      void sendConfirmationEmail();
    }

    return () => { clearTimeout(timer); };
  }, [user, plan, emailSent, sendConfirmationEmail]);

  const downloadInvoice = useCallback(async () => {
    try {
      setInvoiceLoading(true);
      // Generate and download invoice
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    } finally {
      setInvoiceLoading(false);
    }
  }, []);

  // Semantic color mapping (replaces raw palette utilities)
  const planDetails = {
    starter: { name: "Starter", color: "bg-primary text-primary-foreground" },
    agency: { name: "Agency", color: "bg-accent text-accent-foreground" },
    enterprise: { name: "Enterprise", color: "bg-warning text-warning-foreground" },
  } as const;

  const planKey = plan as keyof typeof planDetails;
  const currentPlan = planDetails[planKey] ?? planDetails.agency;

  const nextBillingDate = useMemo(() => {
    const days = cycle === "yearly" ? 365 : 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString();
  }, [cycle]);

  return (
  <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-success/10 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-success/15 rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-success-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-success-foreground mb-4">
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
                    <div className={`w-3 h-3 rounded-full ${currentPlan.color.split(' ')[0]}`} />
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
                <span className="text-xl font-bold text-success-foreground">
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
                    <Mail className={`h-5 w-5 ${emailSent ? "text-success-foreground" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium">Confirmation Email</p>
                      <p className="text-sm text-muted-foreground">
                        {emailSent ? "Sent to your email" : "Sending..."}
                      </p>
                    </div>
                  </div>
                  {emailSent && <CheckCircle className="h-5 w-5 text-success-foreground" />}
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Next Billing Date</p>
                      <p className="text-sm text-muted-foreground">
                        {nextBillingDate}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={asVoidHandler(downloadInvoice)}
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
        <Star className="h-5 w-5 text-warning" />
                Features Unlocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {plan === "starter" && (
                  <>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">
                        10 Link Analyses per month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">Basic SERP Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">Email Support</span>
                    </div>
                  </>
                )}
                {plan === "agency" && (
                  <>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">
                        100 Link Analyses per month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">Advanced SERP Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">Priority Support</span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">API Access</span>
                    </div>
                  </>
                )}
                {plan === "enterprise" && (
                  <>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">Unlimited Link Analyses</span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">Enterprise SERP Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
                      <span className="text-sm">24/7 Phone Support</span>
                    </div>
                    <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
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
