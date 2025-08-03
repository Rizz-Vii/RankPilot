// src/app/(public)/features/page.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Brain,
  Search,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Target,
  BarChart3,
  Eye,
  Link as LinkIcon,
  FileText,
  Lightbulb,
  Rocket,
  CheckCircle,
  ArrowRight,
  Star,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

const neuroSEOFeatures = [
  {
    title: "NeuroSEO™ Dashboard",
    description: "Unified AI-powered SEO intelligence command center",
    icon: Brain,
    badge: "AI Core",
    features: [
      "Real-time SEO health monitoring",
      "AI-driven insights and recommendations",
      "Competitive positioning analysis",
      "Performance trend visualization",
    ],
    tier: "free",
  },
  {
    title: "NeuralCrawler™",
    description: "Intelligent web content extraction and analysis",
    icon: Search,
    badge: "Starter+",
    features: [
      "JavaScript-rendered content crawling",
      "Deep technical SEO analysis",
      "Core Web Vitals monitoring",
      "Mobile-first indexing optimization",
    ],
    tier: "starter",
  },
  {
    title: "SemanticMap™",
    description: "Advanced NLP content topic modeling",
    icon: Target,
    badge: "Starter+",
    features: [
      "Content topic cluster analysis",
      "Semantic keyword relationships",
      "Content gap identification",
      "Topic authority scoring",
    ],
    tier: "starter",
  },
  {
    title: "AI Visibility Engine",
    description: "LLM citation tracking and optimization",
    icon: Eye,
    badge: "Agency+",
    features: [
      "AI model citation tracking",
      "Generative search optimization",
      "Answer box prediction",
      "LLM response optimization",
    ],
    tier: "agency",
  },
  {
    title: "TrustBlock™",
    description: "E-A-T optimization and content authenticity",
    icon: Shield,
    badge: "Starter+",
    features: [
      "Author authority analysis",
      "Content credibility scoring",
      "YMYL compliance checking",
      "Trust signal optimization",
    ],
    tier: "starter",
  },
  {
    title: "RewriteGen™",
    description: "AI-powered content optimization and rewriting",
    icon: FileText,
    badge: "Agency+",
    features: [
      "SEO-optimized content rewriting",
      "Tone and style consistency",
      "Keyword density optimization",
      "Readability enhancement",
    ],
    tier: "agency",
  },
];

const seoTools = [
  {
    title: "Keyword Tool",
    description: "Comprehensive keyword research and analysis",
    icon: TrendingUp,
    features: [
      "Search volume and difficulty analysis",
      "Long-tail keyword discovery",
      "SERP feature opportunities",
      "Seasonal trend analysis",
    ],
  },
  {
    title: "Content Analyzer",
    description: "Deep content optimization insights",
    icon: FileText,
    badge: "Starter+",
    features: [
      "Content quality scoring",
      "Readability optimization",
      "Keyword density analysis",
      "Content structure recommendations",
    ],
  },
  {
    title: "SEO Audit",
    description: "Comprehensive technical SEO analysis",
    icon: CheckCircle,
    features: [
      "100+ technical SEO factors",
      "Site speed optimization",
      "Mobile usability testing",
      "Schema markup validation",
    ],
  },
  {
    title: "Content Brief",
    description: "AI-powered content brief generation",
    icon: Lightbulb,
    badge: "Starter+",
    features: [
      "Competitor content analysis",
      "Target keyword clustering",
      "Content outline generation",
      "Optimization recommendations",
    ],
  },
];

const competitiveIntelligence = [
  {
    title: "Competitor Analysis",
    description: "Deep competitive intelligence and positioning",
    icon: Users,
    badge: "Starter+",
    features: [
      "Competitor keyword tracking",
      "Content gap analysis",
      "Backlink opportunity discovery",
      "SERP position monitoring",
    ],
  },
  {
    title: "SERP View",
    description: "Search engine results page visualization",
    icon: BarChart3,
    badge: "Starter+",
    features: [
      "SERP feature tracking",
      "Ranking position history",
      "Click-through rate analysis",
      "Featured snippet opportunities",
    ],
  },
  {
    title: "Link View",
    description: "Comprehensive backlink analysis and opportunities",
    icon: LinkIcon,
    badge: "Starter+",
    features: [
      "Backlink quality assessment",
      "Link building opportunities",
      "Anchor text optimization",
      "Disavow file generation",
    ],
  },
];

const managementFeatures = [
  {
    title: "Performance Analytics",
    description: "Advanced SEO performance metrics and reporting",
    icon: BarChart3,
    badge: "Starter+",
    features: [
      "Custom dashboard creation",
      "Automated report generation",
      "ROI tracking and attribution",
      "Team collaboration tools",
    ],
  },
  {
    title: "Insights Engine",
    description: "AI-powered actionable insights and recommendations",
    icon: Lightbulb,
    features: [
      "Priority-based recommendations",
      "Impact estimation",
      "Task automation suggestions",
      "Growth opportunity identification",
    ],
  },
];

const tierColors = {
  free: "bg-green-100 text-green-800",
  starter: "bg-blue-100 text-blue-800",
  agency: "bg-purple-100 text-purple-800",
  enterprise: "bg-orange-100 text-orange-800",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={0}
          >
            <Badge className="mb-4" variant="secondary">
              NeuroSEO™ Suite
            </Badge>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              AI-First SEO Intelligence Platform
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              RankPilot's comprehensive suite of AI-powered SEO tools delivers
              enterprise-grade analysis, competitive intelligence, and
              optimization recommendations that drive measurable results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register" className="flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* NeuroSEO™ Suite */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={1}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              NeuroSEO™ Suite
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our flagship AI-powered SEO intelligence platform with six
              specialized engines
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {neuroSEOFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 2}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <feature.icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                      {feature.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {feature.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Tools */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={8}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Core SEO Tools</h2>
            <p className="text-lg text-muted-foreground">
              Essential SEO optimization and analysis tools
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {seoTools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 9}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <tool.icon className="h-6 w-6 text-primary" />
                      {tool.badge && (
                        <Badge variant="outline" className="text-xs">
                          {tool.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base">{tool.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {tool.features.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <Star className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Intelligence */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={13}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Competitive Intelligence
            </h2>
            <p className="text-lg text-muted-foreground">
              Stay ahead with comprehensive competitor analysis
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {competitiveIntelligence.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 14}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <feature.icon className="h-6 w-6 text-primary" />
                      {feature.badge && (
                        <Badge variant="outline" className="text-xs">
                          {feature.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {feature.features.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Management & Analytics */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={17}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Management & Analytics</h2>
            <p className="text-lg text-muted-foreground">
              Advanced reporting and team collaboration features
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {managementFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 18}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <feature.icon className="h-8 w-8 text-primary" />
                      {feature.badge && (
                        <Badge variant="outline">{feature.badge}</Badge>
                      )}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={20}
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your SEO Strategy?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of SEO professionals who trust RankPilot's
              NeuroSEO™ Suite
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register" className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#pricing">View Pricing Plans</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
