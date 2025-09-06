"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

export default function PrivacyClient() {
  const [lastUpdated, setLastUpdated] = useState<string>("");
  useEffect(() => {
    setLastUpdated(new Date().toLocaleDateString());
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <motion.section className="pt-32 pb-10 px-4" initial="hidden" animate="visible" variants={fadeIn} custom={0}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-4 bg-primary/10 rounded-2xl inline-flex mb-4">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            Last updated: {lastUpdated || '—'}
          </p>
        </div>
      </motion.section>

      <section className="pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                  <p>
                    At RankPilot, we take your privacy seriously. This Privacy Policy explains how we collect, use,
                    disclose, and safeguard your information when you use our SEO analysis platform.
                  </p>
                </section>
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                  <h3 className="text-xl font-medium mb-2">Personal Information</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Email address and account credentials</li>
                    <li>Payment information (processed securely through Stripe)</li>
                    <li>Profile information you provide</li>
                  </ul>
                  <h3 className="text-xl font-medium mb-2">Usage Information</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>URLs you analyze and SEO data</li>
                    <li>Usage patterns and feature interactions</li>
                    <li>Device and browser information</li>
                  </ul>
                </section>
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
                  <ul className="list-disc pl-6">
                    <li>Provide and improve our SEO analysis services</li>
                    <li>Process payments and manage subscriptions</li>
                    <li>Send important updates and support communications</li>
                    <li>Analyze usage to enhance platform performance</li>
                  </ul>
                </section>
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
                  <p>We implement industry-standard security measures to protect your data:</p>
                  <ul className="list-disc pl-6">
                    <li>Encryption in transit and at rest</li>
                    <li>Secure payment processing through Stripe</li>
                    <li>Regular security audits and monitoring</li>
                    <li>Access controls and authentication</li>
                  </ul>
                </section>
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
                  <p>We use trusted third-party services:</p>
                  <ul className="list-disc pl-6">
                    <li><strong>Firebase:</strong> Authentication and data storage</li>
                    <li><strong>Stripe:</strong> Secure payment processing</li>
                    <li><strong>OpenAI:</strong> AI-powered SEO analysis</li>
                  </ul>
                </section>
                <section className="mb-2">
                  <h2 className="text-2xl font-semibold mb-4">Your Rights & Contact</h2>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Access and update your personal information</li>
                    <li>Delete your account and associated data</li>
                    <li>Export your data</li>
                    <li>Opt-out of marketing communications</li>
                  </ul>
                  <p>
                    If you have questions about this Privacy Policy, please contact us at
                    <a href="mailto:privacy@rankpilot.com" className="text-primary hover:underline"> privacy@rankpilot.com</a>
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
