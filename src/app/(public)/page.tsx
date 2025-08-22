"use client";
import { AuthAwareHero } from "@/components/auth-aware-homepage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Brain, Coins, LineChart, Link2, Rocket, Search, TrendingUp, Users2, Workflow, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
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
  | "Competitor Tracking"
  | "NeuroSemantic Engine"
  | "Backlink Intelligence"
  | "Automation Recipes"
  | "Content RewriteGen"
  | "Revenue & Attribution"
  | "Team Collaboration"
  | "Performance & Core Web Vitals";

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
  "NeuroSemantic Engine": {
    initial: { y: -20, opacity: 0, scale: 0.7, rotate: -10 },
    animate: { y: 0, opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 280, damping: 20 } },
    hover: { scale: 1.18, rotate: 8, y: -10, transition: { type: 'spring', stiffness: 220, damping: 16 } }
  },
  "Backlink Intelligence": {
    initial: { x: -20, opacity: 0, scale: 0.7 },
    animate: { x: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
    hover: { scale: 1.16, x: 10, transition: { type: 'spring', stiffness: 240, damping: 18 } }
  },
  "Automation Recipes": {
    initial: { x: 15, opacity: 0, scale: 0.7, rotate: 15 },
    animate: { x: 0, opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } },
    hover: { scale: 1.22, rotate: 12, x: 25, transition: { type: 'spring', stiffness: 220, damping: 16 } }
  },
  "Content RewriteGen": {
    initial: { y: 30, opacity: 0, scale: 0.7 },
    animate: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 18 } },
    hover: { scale: 1.18, y: -6, transition: { type: 'spring', stiffness: 240, damping: 16 } }
  },
  "Revenue & Attribution": {
    initial: { x: -30, opacity: 0, scale: 0.7 },
    animate: { x: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } },
    hover: { scale: 1.2, x: 35, transition: { type: 'spring', stiffness: 230, damping: 16 } }
  },
  "Team Collaboration": {
    initial: { x: 20, opacity: 0, scale: 0.7 },
    animate: { x: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } },
    hover: { scale: 1.16, x: 12, transition: { type: 'spring', stiffness: 240, damping: 16 } }
  },
  "Performance & Core Web Vitals": {
    initial: { y: -24, opacity: 0, scale: 0.7 },
    animate: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } },
    hover: { scale: 1.2, y: -12, transition: { type: 'spring', stiffness: 240, damping: 16 } }
  }
};

const features: {
  title: FeatureTitle;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  detailedDescription: string;
}[] = [
  {
    title: "Site Audit",
  desc: "160+ technical checks • JS rendering • Core Web Vitals • Structured data & link graph scoring.",
    icon: Search,
    detailedDescription:
      "The audit core combines deterministic crawling + AI heuristic evaluation. We surface prioritized issues across rendering, performance, accessibility, structured data, indexation signals, internal linking flow and Core Web Vitals—ranked by projected organic impact and ease of implementation.",
  },
  {
    title: "Keyword Intelligence",
  desc: "Intent clustering • Opportunity scoring • SERP feature deltas • Competitive gap surfacing.",
    icon: TrendingUp,
    detailedDescription:
      "Advanced embedding & transformer pipelines map searcher intent clusters, uncover adjacent demand, and score expansion vectors. Automatic SERP feature tracking + competitive gap delta streams feed always-fresh content briefs and rank defense intelligence.",
  },
  {
    title: "Competitor Tracking",
  desc: "Live competitor graph: content velocity, backlink momentum, authority & visibility share shifts.",
    icon: Rocket,
    detailedDescription:
      "We continuously profile competitor inventories—tracking publishing cadence, link acquisition slope, SERP volatility pockets and authority concentration. Receive proactive alerts when emerging entrants threaten share or when defensive refresh windows open.",
  },
  {
    title: "NeuroSemantic Engine",
    desc: "Entity graphing • topical coverage gaps • semantic depth scoring.",
    icon: Brain,
    detailedDescription:
      "Maps your domain's semantic surface area vs. market demand, revealing entity gaps, internal linking reinforcement vectors and latent topic clusters to accelerate authoritative depth construction.",
  },
  {
    title: "Backlink Intelligence",
    desc: "Acquisition slope • authority velocity • toxicity dampening patterns.",
    icon: Link2,
    detailedDescription:
      "Consolidated backlink profiling with momentum detection, emerging referrers, decay risk forecasting and trust-layer heuristics—informing safer acquisition prioritization.",
  },
  {
    title: "Automation Recipes",
    desc: "Trigger → transform → action flows across audits, content & outreach.",
    icon: Workflow,
    detailedDescription:
      "Composable, reusable automation graph: schedule or event-trigger technical rescans, content refresh scoring, outreach queue hydration and structured export pushes without brittle scripting.",
  },
  {
    title: "Content RewriteGen",
    desc: "On‑demand refactors • tone adaptation • semantic enrichment layers.",
    icon: Zap,
    detailedDescription:
      "Guided, constraint-aware regeneration preserving factual anchors while boosting semantic density, intent alignment and internal link anchor optimization—human-in-the-loop safe guards included.",
  },
  {
    title: "Revenue & Attribution",
    desc: "Pipeline influence • assisted conversions • growth cohort lift.",
    icon: Coins,
    detailedDescription:
      "Connect visibility movements to commercial impact via blended attribution heuristics, cohort progression slope tracking and assisted contribution modeling—finally prove organic's compounding delta.",
  },
  {
    title: "Team Collaboration",
    desc: "Shared workspaces • context-preserving comments • role / tier gating.",
    icon: Users2,
    detailedDescription:
      "Align stakeholders with prioritized queues, inline threaded discussions, change tracking snapshots and progressive disclosure of advanced modules by role & subscription tier.",
  },
  {
    title: "Performance & Core Web Vitals",
    desc: "Real-time lab + field blend • regression detection • impact modeling.",
    icon: LineChart,
    detailedDescription:
      "Unified performance telemetry overlays indexation & ranking volatility to highlight causal chains; regression early-warning layers feed into automation recipes for proactive remediation.",
  },
];

export default function HomePage() {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  // Future: unify CTA variant selection with server hint if experimentation platform added.
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main
        id="main-content"
        className="flex-grow flex flex-col items-center px-4 py-12 text-foreground"
      >
        {/* Hero with language selector */}
        <div className="w-full max-w-6xl flex flex-col items-stretch gap-4">
          {/* Removed duplicate language selector (already present in global header) */}
          <AuthAwareHero />
        </div>

        {/* Feature Highlights with animated icons (semantic list) */}
        <section id="features" className="section-gap max-w-6xl w-full text-left" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Platform Feature Modules</h2>
          <ul className="grid md:grid-cols-3 gap-8 list-none p-0 m-0" role="list">
            {features.map((item, i) => (
              <li key={item.title} className="h-full">
                <Dialog>
                  <DialogTrigger asChild>
                    <motion.div
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                      custom={i}
                      className="cursor-pointer h-full micro-hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      aria-label={`${item.title} – ${item.desc}`}
                    >
                      <Card className="h-full" role="group" aria-labelledby={`feature-${i}-title`}>
                        <CardHeader className="flex flex-row items-center gap-1">
                          <CardTitle id={`feature-${i}-title`} className="text-lg font-semibold">
                            {item.title}
                          </CardTitle>
                          <div className="w-[90px] h-10 flex items-center justify-center overflow-visible" aria-hidden="true">
                            {/* Icon animation */}
                            <motion.span
                              variants={iconAnimations[item.title]}
                              initial="initial"
                              animate={hoveredIdx === i ? "hover" : "animate"}
                              className="text-primary"
                              style={{ display: "inline-block" }}
                            >
                              <item.icon className="h-6 w-6" />
                            </motion.span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
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
                      <DialogDescription className="pt-4 font-body text-base leading-relaxed">
                        {item.detailedDescription}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </li>
            ))}
          </ul>
        </section>

        {/* Screenshot */}
        <section className="section-gap-sm w-full max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Unified Growth & Visibility Command Center
          </h2>
          <p className="text-muted-foreground mb-6 max-w-3xl mx-auto">
            A single operating layer for audit telemetry, semantic expansion, competitive posture,
            execution velocity and outcome attribution. Remove data silos—align technical, content & strategy.
          </p>
          <Card className="rounded-xl overflow-hidden" aria-label="Product dashboard screenshot">
            <Image
              src="/images/CaptureDash.png"
              alt="RankPilot SEO analytics dashboard showing performance, keyword, and backlink panels"
              data-ai-hint="dashboard computer screen"
              width={1200}
              height={700}
              className="w-full h-full object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
            />
          </Card>
        </section>

        {/* About Us */}
        <motion.section
          id="about"
          className="section-gap w-full max-w-4xl text-center"
        >
          <h2 className="text-3xl font-bold mb-6">What Makes NeuroSEO™ Different</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Integrated Data Fabric</h3>
              <p className="text-muted-foreground">
                Streaming ingestion + adaptive caching unify crawl diagnostics, SERP deltas,
                link graph signals, content semantics and performance telemetry into one ML-normalized layer.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Coordinated AI Engines</h3>
              <p className="text-muted-foreground">
                NeuralCrawler™, SemanticMap™, Visibility Engine, TrustBlock™, RewriteGen™, Forecast Core
                and the Orchestrator collaborate—ranking actions by marginal impact while preserving deterministic audit traceability.
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
          className="section-gap-lg max-w-4xl w-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-10 text-primary-foreground text-center shadow-xl hover:shadow-2xl transition-shadow duration-300 micro-hover-lift"
        >
          <h2 className="text-3xl font-bold mb-4">Activate Compounding Organic Growth</h2>
          <p className="text-lg mb-6 opacity-90">
            Teams replace fragmented stacks with RankPilot—faster triage, smarter prioritization,
            tighter feedback loops and measurable revenue impact.
          </p>
          <div className="flex flex-col items-center gap-4">
            <PrimaryCta />
            <ul className="flex flex-wrap justify-center gap-3 text-[11px] font-medium opacity-90" aria-label="Trust badges">
              <li className="px-2 py-1 rounded bg-primary/20">SOC 2 in progress</li>
              <li className="px-2 py-1 rounded bg-primary/20">GDPR-aligned</li>
              <li className="px-2 py-1 rounded bg-primary/20">99.9% Uptime Target</li>
              <li className="px-2 py-1 rounded bg-primary/20">No CC required</li>
            </ul>
          </div>
        </motion.section>

        {/* Testimonials */}
        <section className="section-gap-lg text-center max-w-4xl w-full">
          <h2 className="text-3xl font-bold mb-10">Customer Outcomes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sophie M.",
                company: "Digital Surge",
                text: "Reduced audit cycles 70% and reallocated analyst hours to strategic initiatives within 2 weeks.",
              },
              {
                name: "James T.",
                company: "eCom Growth",
                text: "+40% organic revenue QoQ after implementing opportunity clusters & automated technical fixes.",
              },
              {
                name: "Leila A.",
                company: "SEO Freelance Pro",
                text: "Consolidated 5 legacy tools → single workspace; doubled monthly deliverable throughput.",
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
        <section id="faq" className="section-gap max-w-3xl w-full text-left">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <FAQ
            question="Do I need a credit card to start?"
            answer="No. Spin up a workspace free—upgrade only when you’re ready to unlock automation & advanced engines."
          />
          <FAQ
            question="What search surfaces are supported?"
            answer="Google core + SERP features today; Bing, AI overviews and additional generative surfaces in active development."
          />
          <FAQ
            question="Can I cancel or downgrade?"
            answer="Yes. Self‑serve downgrade / cancellation at any time—no lock‑in, your data remains exportable."
          />
          <FAQ
            question="How fast can we see impact?"
            answer="Most teams surface high‑impact technical & content fixes inside the first 48 hours and deploy prioritized actions within the first week."
          />
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="section-gap mb-24 text-center max-w-6xl w-full"
        >
          <h2 className="text-3xl font-bold mb-6">Transparent, Value-Aligned Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard title="Starter" price="$19/mo" features={["Technical & Content Audits", "Keyword & Intent Mapping", "Core Dashboards"]} />
            <PricingCard title="Agency" price="$49/mo" features={["All Starter", "Automations & RewriteGen™", "Collaboration & Reporting"]} />
            <PricingCard title="Enterprise" price="Custom" features={["Advanced Data Export", "Dedicated Success Layer", "Security & Compliance Add‑Ons"]} />
          </div>
        </section>
      </main>
    </div>
  );
}

// Primary CTA with lightweight A/B variant (client-side persistence)
function PrimaryCta() {
  const [label, setLabel] = React.useState("Start 7‑Day Free Trial");
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const key = 'rp_cta_variant_v1';
      let variant = window.localStorage.getItem(key);
      if (!variant) {
        variant = Math.random() < 0.5 ? 'A' : 'B';
        window.localStorage.setItem(key, variant);
      }
      const text = variant === 'A' ? 'Start 7‑Day Free Trial' : 'Get Started Free';
      setLabel(text);
      window.dispatchEvent(new CustomEvent('cta-variant-shown', { detail: { variant } }));
    } catch {}
  }, []);
  return (
    <Button size="lg" variant="secondary" asChild data-cta-variant={label} className="micro-hover-lift" onClick={() => {
      try { window.dispatchEvent(new CustomEvent('cta-click', { detail: { label } })); } catch {}
    }}>
      <Link href="/register">{label}</Link>
    </Button>
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
  const planParam = title.toLowerCase();
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
          <Link href={`/pricing?plan=${planParam}`}>Choose Plan</Link>
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

// (Structured data moved to src/seo/schema.ts to keep page exports minimal.)
