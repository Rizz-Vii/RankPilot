"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Confetti } from "@/components/ui/confetti";
import { motion } from "framer-motion";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: _user } = useAuth();
  const [showConfetti, setShowConfetti] = useState(true);

  const sessionId = searchParams?.get("session_id");

  useEffect(() => {
    // Hide confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If no session ID, redirect to pricing
    if (!sessionId) {
      router.push("/pricing");
    }
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-blue-50 flex items-center justify-center p-4">
      {showConfetti && <Confetti duration={5000} particleCount={100} />}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="border-green-200 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6"
            >
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-success-foreground mx-auto" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-8 w-8 text-yellow-500" />
                </motion.div>
              </div>
            </motion.div>

            <CardTitle className="text-3xl font-bold text-green-700 mb-4">
              Welcome to RankPilot Pro! 🎉
            </CardTitle>

            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Your subscription has been successfully activated. You now have
              access to all premium SEO tools and features.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* What's Next */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
              <h3 className="font-semibold text-lg mb-4 text-blue-900">
                What's next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-foreground flex-shrink-0" />
                  <span className="text-sm">
                    Access to advanced SEO audit tools
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-foreground flex-shrink-0" />
                  <span className="text-sm">
                    AI-powered keyword research and content optimization
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-foreground flex-shrink-0" />
                  <span className="text-sm">
                    Competitor analysis and SERP tracking
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success-foreground flex-shrink-0" />
                  <span className="text-sm">
                    Priority support and weekly reports
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="flex-1">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link href="/tools/audit">Start SEO Audit</Link>
              </Button>
            </div>

            {/* Support */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Need help getting started?
              </p>
              <Button asChild variant="link" size="sm">
                <Link href="/settings?tab=billing">Manage Subscription</Link>
              </Button>
              <span className="mx-2 text-muted-foreground">•</span>
              <Button asChild variant="link" size="sm">
                <Link href="/support">Contact Support</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

