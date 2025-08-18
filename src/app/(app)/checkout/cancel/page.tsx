"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CheckoutCancelPage() {


  return (
  <div className="min-h-screen bg-gradient-to-br from-destructive/10 via-background to-warning/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
  <Card className="border-destructive/30 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6"
            >
              <XCircle className="h-20 w-20 text-destructive-foreground mx-auto" />
            </motion.div>

            <CardTitle className="text-3xl font-bold text-destructive-foreground mb-4">
              Checkout Canceled
            </CardTitle>

            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              No worries! Your checkout was canceled and no payment was
              processed. You can try again whenever you're ready.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Why Upgrade Section */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border border-primary/20">
              <h3 className="font-semibold text-lg mb-4 text-primary">
                Why upgrade your plan?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">Advanced SEO audits</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-sm">AI-powered insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm">Unlimited keyword tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <span className="text-sm">Priority support</span>
                </div>
              </div>
            </div>

            {/* Special Offer */}
            <div className="bg-gradient-to-r from-warning/10 to-warning/20 rounded-lg p-4 border border-warning/30">
              <div className="flex items-center gap-3">
                <div className="bg-warning/20 p-2 rounded-full">
                  <RefreshCw className="h-5 w-5 text-warning-foreground" />
                </div>
                <div>
                  <h4 className="font-medium text-warning-foreground">
                    Limited Time Offer
                  </h4>
                  <p className="text-sm text-warning-foreground/80">
                    Get 2 months free with annual billing.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="flex-1">
                <Link href="/pricing">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>

            {/* Help Section */}
            <div className="text-center pt-4 border-t">
              <div className="flex items-center justify-center gap-2 mb-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Need help?</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Our team is here to answer any questions about our plans and
                features.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild variant="link" size="sm">
                  <Link href="/contact">Contact Sales</Link>
                </Button>
                <span className="hidden sm:inline text-muted-foreground">
                  •
                </span>
                <Button asChild variant="link" size="sm">
                  <Link href="/support">Get Support</Link>
                </Button>
                <span className="hidden sm:inline text-muted-foreground">
                  •
                </span>
                <Button asChild variant="link" size="sm">
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

