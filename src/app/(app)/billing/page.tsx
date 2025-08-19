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
  Calendar,
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
import { fetchBillingData, type BillingDataResult } from "@/lib/billing/fetch-billing-data";
import type { NormalizedUsageMetrics } from '@/lib/billing/fetch-usage-metrics';
import { fetchUsageMetrics } from '@/lib/billing/fetch-usage-metrics';
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { getLogger } from "@/lib/logging/app-logger";
import { useSubscription } from "@/hooks/useSubscription";

// FIN-02: Wiring live usage metrics and payment method is implemented via fetchUsageMetrics and /api/billing/payment-method

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, loading } = useAuth();
  const [billing, setBilling] = useState<BillingDataResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { canUseFeature } = useSubscription();
  const billingPortalEnabled = canUseFeature('billing_portal_access');
  interface PaymentMethod { brand:string; last4:string; expMonth:number; expYear:number }
  const [paymentMethodState, setPaymentMethodState] = useState<PaymentMethod|null>(null);
  const [isManagingPortal, setIsManagingPortal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleUpgrade = (plan?: string) => {
    toast.info("Redirecting to upgrade options...");
    // Redirect to pricing page with optional preselected plan
    if (typeof window !== "undefined") {
      const url = plan ? `/pricing?plan=${plan}` : "/pricing";
      window.location.href = url;
    }
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

  const handleManageBilling = async () => {
    try {
      setIsManagingPortal(true);
      const createPortalSession = httpsCallable(functions, "createPortalSession");
  const result: any = await createPortalSession({ userId: user?.uid });
  const url = result?.data?.url;
      if (url) {
        if (typeof window !== 'undefined') window.open(url, '_blank');
      } else {
        toast.error('Failed to open billing portal');
      }
    } catch (e) {
      const err = e as any;
      toast.error(err?.message || 'Failed to open billing portal');
    } finally {
      setIsManagingPortal(false);
    }
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
          <Badge className="bg-success/15 text-success-foreground border border-success/40">
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
            <AlertTriangle className="h-12 w-12 text-warning-foreground mx-auto mb-4" />
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

  // Firestore fetch side-effect
  useEffect(() => {
    if(!user?.uid) return;
    let cancelled = false;
    void (async () => {
      const _logger = getLogger('billing-ui');
      try {
  const data = await fetchBillingData(db, user.uid, { invoiceLimit: 10 });
        if(cancelled) return;
        setBilling(data);
      } catch (e) {
        if(cancelled) return;
        const err = e as any;
        setFetchError(err?.message || 'Failed to load billing data');
        _logger.error('billing-ui.client.fetch.error', { error: err?.message });
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, db, fetchBillingData, getLogger]);

  // Payment method fetch (server API)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken?.();
        const res = await fetch('/api/billing/payment-method', { headers: { authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setPaymentMethodState(json.paymentMethod || null);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if(!billingPortalEnabled) {
  return <div className="min-h-screen flex items-center justify-center"><Card className="w-full max-w-md"><CardHeader className="text-center"><AlertTriangle className="h-12 w-12 text-warning-foreground mx-auto mb-4" /><CardTitle>Billing Portal Disabled</CardTitle><CardDescription>The billing portal is not enabled for your account yet.</CardDescription></CardHeader></Card></div>;
  }

  const subscription = billing?.subscription || null;
  const PAGE_SIZE = 10;
  interface InvoiceLite { id:string; amount:number; period?:string; description?:string; date?:string; createdAt?:Date; issuedAt?:{ toDate:()=>Date }; [k:string]:any }
  const [invoices, setInvoices] = useState<InvoiceLite[]>(billing?.invoices as InvoiceLite[] || []);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Normalize initial invoices to include description/date for display parity with API pagination
  useEffect(() => {
    if (billing?.invoices) {
      const normalized = (billing.invoices || []).map((inv: any) => {
        const createdAt: Date = inv?.createdAt?.toDate?.() || inv?.issuedAt?.toDate?.() || (inv?.date ? new Date(inv.date) : new Date(`${inv?.period || '1970-01'}-01T00:00:00Z`));
        return {
          ...inv,
          description: inv?.description || `Invoice ${inv?.period}`,
          date: inv?.date || createdAt.toISOString(),
          createdAt,
        };
      });
      setInvoices(normalized);
      setHasMore((billing.invoices || []).length === PAGE_SIZE);
    }
  }, [billing?.invoices, PAGE_SIZE]);
  const pageCount = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const paginated = invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  async function maybeLoadMore(nextPage: number) {
    if (nextPage * PAGE_SIZE < invoices.length) return;
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const last = invoices[invoices.length - 1];
  // Use composite cursor if API returned one previously (stored on last invoice as _cursor maybe later) else fallback
  const cursor = last?.periodAndCreatedAtCursor || last?.period;
      const token = await user?.getIdToken?.();
      const res = await fetch(`/api/billing/invoices?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`, { headers: { authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
  const newOnes = (json.invoices || []).filter((inv: any) => !invoices.some(i => i.id === inv.id));
        // Attach composite cursor to each invoice for subsequent pagination
        if(json.nextCursor && newOnes.length) {
          // store on the last currently loaded invoice for retrieval
          newOnes[newOnes.length - 1].periodAndCreatedAtCursor = json.nextCursor;
        }
        if (newOnes.length) setInvoices(prev => [...prev, ...newOnes]);
        setHasMore(json.hasMore);
      }
    } catch { /* silent */ } finally { setLoadingMore(false); }
  }
  function changePage(delta: number) { const next = Math.min(Math.max(0, page + delta), pageCount - 1); if (next !== page) { setPage(next); if (delta > 0) void maybeLoadMore(next); } }
  const currentPlan = subscription ? {
    name: subscription.tier || 'unknown',
    price: billing?.effectiveMonthly || 0,
    billingCycle: 'monthly',
    nextBillingDate: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : '',
    status: subscription.status || 'active'
  } : {
    name: 'Free', price: 0, billingCycle: 'monthly', nextBillingDate: new Date().toISOString(), status: 'free'
  };
  // Align with server contract (expMonth/expYear)
  const paymentMethod: PaymentMethod = paymentMethodState || { brand: '••••', last4: '----', expMonth: 0, expYear: 0 };
  const [usageMetrics, setUsageMetrics] = useState<NormalizedUsageMetrics | null>(null);
  useEffect(() => { if(!user?.uid) return; let cancelled=false; void (async () => { const m = await fetchUsageMetrics(db, user.uid); if(!cancelled) setUsageMetrics(m); })(); return () => { cancelled = true; }; }, [user?.uid, db, fetchUsageMetrics]);
  const usage = usageMetrics ? { keywordsTracked: usageMetrics.keywordsTracked, keywordsLimit: usageMetrics.keywordsLimit, competitorAnalysis: usageMetrics.competitorAnalysis, competitorLimit: usageMetrics.competitorLimit, reportsGenerated: usageMetrics.reportsGenerated, currentPeriodStart: usageMetrics.periodStart.toISOString(), currentPeriodEnd: usageMetrics.periodEnd.toISOString() } : { keywordsTracked: 0, keywordsLimit: 0, competitorAnalysis: 0, competitorLimit: 0, reportsGenerated: 0, currentPeriodStart: currentPlan.nextBillingDate, currentPeriodEnd: currentPlan.nextBillingDate };

  if(fetchError) {
  return <div className="min-h-screen flex items-center justify-center"><Card className="w-full max-w-md"><CardHeader className="text-center"><AlertTriangle className="h-12 w-12 text-destructive-foreground mx-auto mb-4" /><CardTitle>Billing Load Error</CardTitle><CardDescription>{fetchError}</CardDescription></CardHeader><CardContent className="flex justify-center"><Button variant="outline" onClick={()=>{setFetchError(null); setBilling(null);}}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button></CardContent></Card></div>;
  }

  if(!billing && user) {
    return <LoadingScreen fullScreen text="Loading billing information..." />;
  }

  return (
    <main role="main" className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" aria-label="Billing portal main content">
      <div className="max-w-7xl mx-auto px-4 py-8" data-testid="billing-root">
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
            <Card data-testid="usage-section">
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
                  <Button onClick={() => handleUpgrade()}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade Plan
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
            <Card data-testid="billing-history">
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
                        {usage.keywordsTracked} / {usage.keywordsLimit === -1 ? '∞' : usage.keywordsLimit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(usage.keywordsLimit && usage.keywordsLimit > 0) ? Math.min(100, (usage.keywordsTracked / usage.keywordsLimit) * 100) : 0}%`,
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
                        {usage.competitorAnalysis} / {usage.competitorLimit === -1 ? '∞' : usage.competitorLimit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(usage.competitorLimit && usage.competitorLimit > 0) ? Math.min(100, (usage.competitorAnalysis / usage.competitorLimit) * 100) : 0}%`,
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
                  {paginated.map((invoice) => (
                    <div
                      key={invoice.id}
                      data-testid="invoice-row"
                      className="flex items-center justify-between p-4 border rounded-lg"
                      aria-label={`Invoice ${invoice.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(invoice.date || new Date().toISOString())}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">${invoice.amount}</p>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-success-foreground" />
                            <span className="text-xs text-success-foreground/90">Paid</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-6">No invoices yet.</div>
                  )}
                  {invoices.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-4" aria-label="Invoice pagination controls">
                      <Button size="sm" variant="outline" disabled={page===0} onClick={()=>changePage(-1)}>Previous</Button>
                      <p className="text-xs text-muted-foreground">Page {page+1} / {pageCount}{hasMore ? '+' : ''}</p>
                      <div className="flex gap-2">
                        {hasMore && page+1>=pageCount && (
                          <Button size="sm" disabled={loadingMore} onClick={()=>changePage(1)}>{loadingMore ? 'Loading…' : 'Load More'}</Button>
                        )}
                        <Button size="sm" variant="outline" disabled={page+1>=pageCount} onClick={()=>changePage(1)}>Next</Button>
                      </div>
                    </div>
                  )}
                  {hasMore && page+1>=pageCount && (
                    <div className="pt-2">
                      <button
                        type="button"
                        data-testid="view-all-invoices"
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                        aria-label="View all invoices in billing portal"
                        onClick={() => void handleManageBilling()}
                      >
                        View all invoices
                      </button>
                    </div>
                  )}
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
                      Expires {paymentMethod.expMonth}/
                      {paymentMethod.expYear}
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
                <Button className="w-full" onClick={() => void handleManageBilling()} disabled={isManagingPortal}>
                  {isManagingPortal ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Opening Portal...
                    </div>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Subscription
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
                    <span className="text-success-foreground">Enabled</span>
                    {/* semantic success */}
                    {/* replaced raw tailwind green with success token */}
                    {/* above line kept for minimal diff readability */}
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
    </main>
  );
}

