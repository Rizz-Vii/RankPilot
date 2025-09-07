"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Variants } from "framer-motion";
import { LazyMotion, domAnimation, m } from "framer-motion";
import {
  Brain,
  Coins,
  LineChart,
  Link2,
  Rocket,
  TrendingUp,
  Users2,
  Workflow,
  Zap,
} from "lucide-react";
import Image from "next/image";
import React from "react";

type FeatureTitle =
  | "Keyword Intelligence"
  | "Competitor Tracking"
  | "NeuroSemantic Engine"
  | "Backlink Intelligence"
  | "Automation Recipes"
  | "Content RewriteGen"
  | "Revenue & Attribution"
  | "Team Collaboration"
  | "Performance & Core Web Vitals";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
} as const;

const iconAnimations: Record<FeatureTitle, Variants> = {
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
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 280, damping: 20 },
    },
    hover: {
      scale: 1.18,
      rotate: 8,
      y: -10,
      transition: { type: "spring", stiffness: 220, damping: 16 },
    },
  },
  "Backlink Intelligence": {
    initial: { x: -20, opacity: 0, scale: 0.7 },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
    hover: {
      scale: 1.16,
      x: 10,
      transition: { type: "spring", stiffness: 240, damping: 18 },
    },
  },
  "Automation Recipes": {
    initial: { x: 15, opacity: 0, scale: 0.7, rotate: 15 },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
    hover: {
      scale: 1.22,
      rotate: 12,
      x: 25,
      transition: { type: "spring", stiffness: 220, damping: 16 },
    },
  },
  "Content RewriteGen": {
    initial: { y: 30, opacity: 0, scale: 0.7 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 320, damping: 18 },
    },
    hover: {
      scale: 1.18,
      y: -6,
      transition: { type: "spring", stiffness: 240, damping: 16 },
    },
  },
  "Revenue & Attribution": {
    initial: { x: -30, opacity: 0, scale: 0.7 },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 18 },
    },
    hover: {
      scale: 1.2,
      x: 35,
      transition: { type: "spring", stiffness: 230, damping: 16 },
    },
  },
  "Team Collaboration": {
    initial: { x: 20, opacity: 0, scale: 0.7 },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 18 },
    },
    hover: {
      scale: 1.16,
      x: 12,
      transition: { type: "spring", stiffness: 240, damping: 16 },
    },
  },
  "Performance & Core Web Vitals": {
    initial: { y: -24, opacity: 0, scale: 0.7 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 18 },
    },
    hover: {
      scale: 1.2,
      y: -12,
      transition: { type: "spring", stiffness: 240, damping: 16 },
    },
  },
};

type FeatureItem = {
  title: FeatureTitle;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  detailedDescription: string;
  imageSrc?: string;
  imageAlt?: string;
};

const features: FeatureItem[] = [
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

export function HomeFeaturesGrid() {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  return (
    <LazyMotion features={domAnimation} strict>
      <section
        id="platform-features"
        className="section-gap max-w-6xl w-full text-left"
        aria-labelledby="features-heading"
      >
        <h2 id="features-heading" className="sr-only">
          Platform Feature Modules
        </h2>
        <ul className="grid md:grid-cols-3 gap-8 list-none p-0 m-0" role="list">
          {features.map((item, i) => (
            <li key={item.title} className="h-full">
              <Dialog>
                <DialogTrigger asChild>
                  <m.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    className="cursor-pointer h-full micro-hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    aria-label={`${item.title} – ${item.desc}`}
                  >
                    <Card
                      className="h-full"
                      role="group"
                      aria-labelledby={`feature-${i}-title`}
                    >
                      <CardHeader className="flex flex-row items-center gap-1">
                        <CardTitle
                          id={`feature-${i}-title`}
                          className="text-lg font-semibold"
                        >
                          {item.title}
                        </CardTitle>
                        <div
                          className="w-[90px] h-10 flex items-center justify-center overflow-visible"
                          aria-hidden="true"
                        >
                          {(() => {
                            const IconComponent: React.ComponentType<{
                              className?: string;
                            }> = item.icon;
                            return (
                              <m.span
                                variants={iconAnimations[item.title]}
                                initial="initial"
                                animate={hoveredIdx === i ? "hover" : "animate"}
                                className="text-primary"
                                style={{ display: "inline-block" }}
                              >
                                <IconComponent className="h-6 w-6" />
                              </m.span>
                            );
                          })()}
                        </div>
                      </CardHeader>
                      {/* Example marketing illustration slot (optimized) */}
                      {/* If an illustration URL exists on item, use next/image for optimization */}
                      {typeof item.imageSrc === "string" &&
                        item.imageSrc.length > 0 && (
                          <div className="mb-3">
                            <Image
                              src={item.imageSrc}
                              alt={
                                item.imageAlt || `${item.title} illustration`
                              }
                              width={640}
                              height={360}
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="w-full h-auto rounded-md"
                              priority={false}
                            />
                          </div>
                        )}
                      <CardContent>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.desc}
                        </p>
                      </CardContent>
                    </Card>
                  </m.div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
                      {(() => {
                        const IconComponent: React.ComponentType<{
                          className?: string;
                        }> = item.icon;
                        return (
                          <IconComponent className="h-6 w-6 text-primary" />
                        );
                      })()}
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
    </LazyMotion>
  );
}

export default HomeFeaturesGrid;
