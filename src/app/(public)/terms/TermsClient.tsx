"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Scale, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const makeFadeIn = (duration: number, step: number) => ({
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * step, duration },
  }),
});

export default function TermsClient() {
  const [lastUpdated, setLastUpdated] = useState<string>("");
  useEffect(() => { setLastUpdated(new Date().toLocaleDateString()); }, []);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false;
  const duration = prefersReducedMotion || isMobile ? 0.35 : 0.6;
  const step = prefersReducedMotion || isMobile ? 0.08 : 0.15;
  const fadeIn = makeFadeIn(duration, step);
  return (
    <div className="min-h-[100dvh] sm:min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero */}
      <motion.section
        className="pt-32 pb-16 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-20% 0px -10% 0px" }}
        variants={fadeIn}
        custom={0}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">Terms of Service</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Please review our terms that govern the use of RankPilot. We keep things
            transparent and easy to understand.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90" aria-label="View Privacy Policy">
              <Link href="/privacy" aria-label="View Privacy Policy">
                <FileText className="mr-2 h-5 w-5" /> View Privacy Policy
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" aria-label="Contact Legal">
              <Link href="/contact" aria-label="Contact Legal">
                <Scale className="mr-2 h-5 w-5" /> Contact Legal
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4" suppressHydrationWarning>
            Last updated: {lastUpdated || '—'}
          </p>
        </div>
      </motion.section>

      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        custom={5}
      >
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
                  <p>
                    By accessing and using RankPilot, you accept and agree to be bound by the
                    terms and provisions of this agreement.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
                  <p>RankPilot is an AI-powered SEO analysis platform that provides:</p>
                  <ul className="list-disc pl-6">
                    <li>Website SEO analysis and recommendations</li>
                    <li>Competitor analysis and benchmarking</li>
                    <li>Content optimization suggestions</li>
                    <li>Link analysis and SERP tracking</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">User Responsibilities</h2>
                  <ul className="list-disc pl-6">
                    <li>Provide accurate account information</li>
                    <li>Keep your login credentials secure</li>
                    <li>Use the service for legitimate SEO purposes only</li>
                    <li>Respect rate limits and fair usage policies</li>
                    <li>Do not attempt to reverse engineer or abuse the platform</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Subscription and Billing</h2>
                  <ul className="list-disc pl-6">
                    <li>Subscriptions are billed monthly or annually</li>
                    <li>Payments are processed securely through Stripe</li>
                    <li>Refunds may be provided at our discretion</li>
                    <li>You can cancel your subscription at any time</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
                  <p>
                    RankPilot and its original content, features, and functionality are owned by us and
                    are protected by international copyright, trademark, and other intellectual property
                    laws.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
                  <p>
                    RankPilot shall not be liable for any indirect, incidental, special, consequential, or
                    punitive damages resulting from your use of the service.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Termination</h2>
                  <p>
                    We may terminate or suspend your account immediately, without prior notice, for conduct
                    that we believe violates these Terms of Service.
                  </p>
                </section>

                <section className="mb-2">
                  <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
                  <p>
                    We reserve the right to update these terms at any time. We will notify users of any material
                    changes via email or platform notification.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>

      <Card className="mt-6 bg-card text-card-foreground border border-border">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Questions About Our Terms?</h3>
        <p className="text-muted-foreground mb-6">Contact our team and we'll be happy to help.</p>
              <Button asChild variant="secondary" size="lg" aria-label="Email legal@rankpilot.com">
                <Link href="mailto:legal@rankpilot.com" aria-label="Email legal@rankpilot.com">legal@rankpilot.com</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
