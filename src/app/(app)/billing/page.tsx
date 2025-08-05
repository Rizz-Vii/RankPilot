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
import {
  CreditCard,
  Download,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Settings,
  ExternalLink,
  RefreshCw,
  Crown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/ui/loading-screen";
import { toast } from "sonner";

// Mock data - replace with actual API calls
const mockBillingData = {
  currentPlan: {
    name: "Professional",
    price: 79,
    billingCycle: "monthly",
    nextBillingDate: "2024-02-15",
    status: "active",
  },
  paymentMethod: {
    type: "card",
    last4: "4242",
    brand: "Visa",
    expiryMonth: 12,
    expiryYear: 2026,
  },
  invoices: [
    {
      id: "inv_001",
      date: "2024-01-15",
      amount: 79,
      status: "paid",
      description: "Professional Plan - Monthly",
      downloadUrl: "/invoices/inv_001.pdf",
    },
    {
      id: "inv_002",
      date: "2023-12-15",
      amount: 79,
      status: "paid",
      description: "Professional Plan - Monthly",
      downloadUrl: "/invoices/inv_002.pdf",
    },
    {
      id: "inv_003",
      date: "2023-11-15",
      amount: 79,
      status: "paid",
      description: "Professional Plan - Monthly",
      downloadUrl: "/invoices/inv_003.pdf",
    },
  ],
  usage: {
    keywordsTracked: 342,
    keywordsLimit: 500,
    competitorAnalysis: 18,
    competitorLimit: 25,
    reportsGenerated: 45,
    currentPeriodStart: "2024-01-15",
    currentPeriodEnd: "2024-02-15",
  },
};

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const _handleUpgrade = () => {
    toast.info("Redirecting to upgrade options...");
    // Redirect to pricing page with current plan highlighted
  };

  const handleDowngrade = () => {
    toast.info("Contact support to downgrade your plan.");
  };

  const handleUpdatePayment = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Payment method updated successfully!");
    }, 1500);
  };

  const handleCancelSubscription = () => {
    if (
      confirm(
        "Are you sure you want to cancel your subscription? This action cannot be undone."
      )
    ) {
      toast.error(
        "Subscription cancelled. You'll have access until your next billing date."
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Active
          </Badge>
        );
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || !isMounted) {
    return <LoadingScreen fullScreen text="Loading billing information..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle>Access Required</CardTitle>
            <CardDescription>
              Please log in to view your billing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { currentPlan, paymentMethod, invoices, usage } = mockBillingData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">
              Billing & Subscription
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage your subscription, billing details, and view usage statistics
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Current Plan
                  </CardTitle>
                  {getStatusBadge(currentPlan.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                    <p className="text-muted-foreground">
                      ${currentPlan.price}/{currentPlan.billingCycle}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Next billing date
                    </p>
                    <p className="font-semibold">
                      {formatDate(currentPlan.nextBillingDate)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button asChild>
                    <Link href="/pricing">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleDowngrade}>
                    Downgrade
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelSubscription}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Usage This Month</CardTitle>
                <CardDescription>
                  {formatDate(usage.currentPeriodStart)} -{" "}
                  {formatDate(usage.currentPeriodEnd)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Keywords Tracked
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {usage.keywordsTracked} / {usage.keywordsLimit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(usage.keywordsTracked / usage.keywordsLimit) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Competitor Analysis
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {usage.competitorAnalysis} / {usage.competitorLimit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(usage.competitorAnalysis / usage.competitorLimit) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Reports Generated
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {usage.reportsGenerated} this month
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  Download invoices and view payment history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(invoice.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">${invoice.amount}</p>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-success-foreground" />
                            <span className="text-xs text-green-600">Paid</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Method & Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-muted rounded">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {paymentMethod.brand} ending in {paymentMethod.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {paymentMethod.expiryMonth}/
                      {paymentMethod.expiryYear}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleUpdatePayment}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Update Payment Method
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href="/pricing">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View All Plans
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href="/contact">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact Billing Support
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Billing cycle:
                    </span>
                    <span className="capitalize">
                      {currentPlan.billingCycle}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-renewal:</span>
                    <span className="text-green-600">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ID:</span>
                    <span>Not provided</span>
                  </div>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  <p>
                    Your subscription will automatically renew on{" "}
                    {formatDate(currentPlan.nextBillingDate)} unless cancelled.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

