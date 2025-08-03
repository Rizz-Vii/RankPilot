"use client";
import React from "react";
import Image from "next/image";
import "dotenv/config";
import { Button } from "@/components/ui/button";
import { Rocket, Search, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AuthAwareHero } from "@/components/auth-aware-homepage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

type FeatureTitle =
  | "Site Audit"
  | "Keyword Intelligence"
  | "Competitor Tracking";

import type { Variants } from "framer-motion";

const iconAnimations: Record<FeatureTitle, Variants> = {
  "Site Audit": {
    initial: { x: -24, opacity: 0, scale: 0.7, rotate: -20 },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 300, damping: 18 },
    },
    hover: {
      scale: 1.2,
      rotate: 15,
      x: 40,
      transition: { type: "spring", stiffness: 200, damping: 15 },
    },
  },
  "Keyword Intelligence": {
    initial: { x: 4, opacity: 0, scale: 0.7, rotate: 20 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 300, damping: 18 },
    },
    hover: {
      scale: 1.2,
      rotate: 15,
      x: 30,
      transition: { type: "spring", stiffness: 200, damping: 15 },
    },
  },
  "Competitor Tracking": {
    initial: { x: 24, opacity: 0, scale: 0.7, rotate: 20 },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 320, damping: 18 },
    },
    hover: {
      scale: 1.2,
      rotate: 2,
      x: 40,
      transition: { type: "spring", stiffness: 200, damping: 15 },
    },
  },
};

const features: {
  title: FeatureTitle;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  detailedDescription: string;
}[] = [
  {
    title: "Site Audit",
    desc: "Enterprise-grade crawling with NeuroSEO™ intelligence—scan 100+ technical SEO factors, JavaScript rendering, and Core Web Vitals in real-time.",
    icon: Search,
    detailedDescription:
      "Our NeuroSEO™ powered Site Audit engine performs comprehensive technical SEO analysis using advanced crawling algorithms. We identify critical issues across 100+ factors including JavaScript rendering, Core Web Vitals, schema markup, internal linking architecture, and mobile responsiveness. Get actionable insights with prioritized recommendations backed by machine learning pattern recognition.",
  },
  {
    title: "Keyword Intelligence",
    desc: "AI-driven semantic analysis revealing high-value opportunities with search intent mapping, SERP feature tracking, and competitive gap analysis.",
    icon: TrendingUp,
    detailedDescription:
      "Leverage our advanced NLP models to uncover semantic keyword relationships and search intent patterns. Our AI analyzes SERP features, competitor content gaps, and search volume trends to identify high-conversion opportunities. Track rankings across multiple search engines with real-time visibility scoring and automated reporting for enterprise accounts.",
  },
  {
    title: "Competitor Tracking",
    desc: "Advanced competitive intelligence with AI-powered content analysis, backlink monitoring, and strategic positioning insights for market dominance.",
    icon: Rocket,
    detailedDescription:
      "Monitor competitor strategies with enterprise-level intelligence gathering. Our AI analyzes competitor content performance, backlink acquisition patterns, and SERP positioning changes. Get strategic insights into their technical implementations, content gaps, and emerging opportunities to maintain competitive advantage in your market vertical.",
  },
];

export default function HomePage() {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main
        id="main-content"
        className="flex-grow flex flex-col items-center px-4 py-12 text-foreground"
      >
        {/* Hero */}
        <AuthAwareHero />

        {/* Feature Highlights with animated icons */}
        <section
          id="features"
          className="mt-24 grid md:grid-cols-3 gap-8 max-w-6xl w-full text-left"
        >
          {features.map((item, i) => (
            <Dialog key={item.title}>
              <DialogTrigger asChild>
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  className="cursor-pointer h-full"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <Card className="h-full">
                    <CardHeader className="flex flex-row items-center gap-1">
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                      <div className="w-[100px] h-12 flex items-center justify-center overflow-visible">
                        <motion.span
                          variants={iconAnimations[item.title]}
                          initial="initial"
                          animate={hoveredIdx === i ? "hover" : "animate"}
                          className="text-primary"
                          style={{ display: "inline-block" }}
                        >
                          <item.icon className="h-7 w-7" />
                        </motion.span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
                    <item.icon className="h-6 w-6 text-primary" />
                    {item.title}
                  </DialogTitle>
                  <DialogDescription className="pt-4 font-body text-base">
                    {item.detailedDescription}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          ))}
        </section>

        {/* Screenshot */}
        <section className="mt-20 w-full max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Enterprise SEO Command Center
          </h2>
          <p className="text-muted-foreground mb-6 max-w-3xl mx-auto">
            Unified dashboard powered by NeuroSEO™ Suite—real-time crawling
            analysis, AI-driven insights, and comprehensive reporting. Built for
            SEO professionals who demand precision and scalability.
          </p>
          <Card className="rounded-xl overflow-hidden">
            <Image
              src="/images/CaptureDash.png"
              alt="SEO Dashboard Screenshot"
              data-ai-hint="dashboard computer screen"
              width={1200}
              height={700}
              className="w-full h-full object-cover"
              priority
            />
          </Card>
        </section>

        {/* About Us */}
        <motion.section
          id="about"
          className="mt-24 w-full max-w-4xl text-center"
        >
          <h2 className="text-3xl font-bold mb-6">The NeuroSEO™ Advantage</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Enterprise Architecture
              </h3>
              <p className="text-muted-foreground">
                Built on Firebase Cloud Functions with global CDN distribution.
                Our NeuroSEO™ Suite processes millions of data points using
                advanced machine learning models, delivering insights that
                traditional SEO tools simply cannot match.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">AI-First Approach</h3>
              <p className="text-muted-foreground">
                Six specialized AI engines work in orchestration:
                NeuralCrawler™, SemanticMap™, AI Visibility Engine,
                TrustBlock™, RewriteGen™, and our central Orchestrator. Each
                engine optimized for specific SEO challenges at enterprise
                scale.
              </p>
            </Card>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          custom={7}
          className="mt-32 max-w-4xl w-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-10 text-primary-foreground text-center shadow-xl hover:shadow-2xl transition-shadow duration-300"
        >
          <h4 className="text-3xl font-bold mb-4">
            Accelerate Your SEO Performance Today
          </h4>
          <p className="text-lg mb-6 opacity-90">
            Join leading agencies using NeuroSEO™ intelligence.
            Enterprise-grade insights, professional results, proven ROI.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register">Start Free Enterprise Trial</Link>
          </Button>
        </motion.section>

        {/* Testimonials */}
        <section className="mt-32 text-center max-w-4xl w-full">
          <h2 className="text-3xl font-bold mb-8">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sophie M.",
                company: "Digital Surge",
                text: "RankPilot cut our audit time by 70%. It’s an indispensable tool for our agency.",
              },
              {
                name: "James T.",
                company: "eCom Growth",
                text: "We’ve seen a 40% increase in organic traffic since using RankPilot’s recommendations.",
              },
              {
                name: "Leila A.",
                company: "SEO Freelance Pro",
                text: "Everything I need — in one dashboard. No more switching tools constantly.",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                custom={i}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground italic mb-4">
                      “{t.text}”
                    </p>
                    <p className="text-sm font-semibold">
                      — {t.name}, {t.company}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
        {/* FAQ */}
        <section id="faq" className="mt-24 max-w-3xl w-full text-left">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <FAQ
            question="Do I need a credit card to sign up?"
            answer="No. You can start with the free plan immediately — no card required."
          />
          <FAQ
            question="What engines do you track?"
            answer="We currently track Google search results. Bing and others are on the roadmap."
          />
          <FAQ
            question="Can I cancel anytime?"
            answer="Yes, plans are flexible and cancelable anytime through your dashboard."
          />
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="mt-24 mb-24 text-center max-w-6xl w-full"
        >
          <h2 className="text-3xl font-bold mb-6">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              title="Free"
              price="$0/mo"
              features={["5 audits/month", "Basic Reports", "Limited Keywords"]}
            />
            <PricingCard
              title="Starter"
              price="$29/mo"
              features={["50 audits", "Full Reports", "Competitor Tracking"]}
            />
            <PricingCard
              title="Agency"
              price="$99/mo"
              features={[
                "Unlimited Everything",
                "White Label",
                "Priority Support",
              ]}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}

function PricingCard({
  title,
  price,
  features,
}: {
  title: string;
  price: string;
  features: string[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-2xl font-semibold">{price}</p>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="text-left space-y-2 text-muted-foreground">
          {features.map((f, i) => (
            <li key={i}>• {f}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" asChild>
          <Link href="/register">Choose Plan</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="mb-6">
      <h4 className="text-lg font-semibold">{question}</h4>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  );
}
