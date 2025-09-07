"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Brain,
  Clock,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

function useFadeInVariants() {
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return useMemo(() => {
    if (reduceMotion) {
      return {
        hidden: { opacity: 0 },
        visible: (i: number) => ({
          opacity: 1,
          transition: { delay: Math.min(i * 0.05, 0.3), duration: 0.25 },
        }),
      } as const;
    }
    const baseDuration = isMobile ? 0.35 : 0.6;
    const baseDelay = isMobile ? 0.08 : 0.15;
    return {
      hidden: { opacity: 0, y: 24 },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * baseDelay, duration: baseDuration },
      }),
    } as const;
  }, [reduceMotion, isMobile]);
}

const caseStudies = [
  {
    title: "E-commerce Giant Achieves 340% Organic Growth",
    company: "TechRetail Pro",
    industry: "E-commerce",
    duration: "6 months",
    challenge:
      "Declining organic visibility in competitive electronics market with 50,000+ product pages struggling to rank.",
    solution:
      "Implemented NeuroSEO™ Suite with NeuralCrawler™ for technical optimization and RewriteGen™ for product descriptions.",
    results: [
  { metric: "Organic Traffic", value: "+340%", color: "text-success-foreground" },
      {
        metric: "Revenue from Organic",
        value: "+280%",
  color: "text-primary",
      },
      {
        metric: "Keyword Rankings (Top 3)",
        value: "+150%",
  color: "text-accent-foreground",
      },
  { metric: "Conversion Rate", value: "+45%", color: "text-warning-foreground" },
    ],
    tags: ["E-commerce", "Technical SEO", "AI Content"],
    featured: true,
  },
  {
    title: "SaaS Startup Dominates Competitive Keywords",
    company: "CloudFlow Solutions",
    industry: "SaaS",
    duration: "4 months",
    challenge:
      "New SaaS platform needed to compete against established players in project management space.",
    solution:
      "Used AI Visibility Engine and SemanticMap™ to identify content gaps and create authority-building content strategy.",
    results: [
  { metric: "Brand Visibility", value: "+450%", color: "text-success-foreground" },
  { metric: "Lead Generation", value: "+220%", color: "text-primary" },
  { metric: "Featured Snippets", value: "+180%", color: "text-accent-foreground" },
      {
        metric: "Domain Authority",
        value: "+35 points",
  color: "text-warning-foreground",
      },
    ],
    tags: ["SaaS", "Content Strategy", "Brand Building"],
    featured: false,
  },
  {
    title: "Healthcare Practice Achieves Local Dominance",
    company: "Metro Health Group",
    industry: "Healthcare",
    duration: "3 months",
    challenge:
      "Multi-location healthcare practice struggling with local search visibility and patient acquisition.",
    solution:
      "Leveraged TrustBlock™ for E-A-T optimization and Orchestrator for multi-location strategy coordination.",
    results: [
      {
        metric: "Local Search Visibility",
        value: "+520%",
  color: "text-success-foreground",
      },
  { metric: "Patient Inquiries", value: "+180%", color: "text-primary" },
      {
        metric: "Google My Business Views",
        value: "+300%",
  color: "text-accent-foreground",
      },
      {
        metric: "Appointment Bookings",
        value: "+150%",
  color: "text-warning-foreground",
      },
    ],
    tags: ["Healthcare", "Local SEO", "E-A-T"],
    featured: false,
  },
  {
    title: "Enterprise Software Company Scales Content",
    company: "DataSync Enterprise",
    industry: "Enterprise Software",
    duration: "8 months",
    challenge:
      "Complex B2B software needed to educate market and compete against industry leaders with massive content libraries.",
    solution:
      "Deployed full NeuroSEO™ Suite for comprehensive content scaling and technical optimization across 500+ pages.",
    results: [
  { metric: "Organic Sessions", value: "+290%", color: "text-success-foreground" },
  { metric: "Content Performance", value: "+400%", color: "text-primary" },
      {
        metric: "Sales Qualified Leads",
        value: "+160%",
  color: "text-accent-foreground",
      },
      {
        metric: "Content Production Speed",
        value: "+600%",
  color: "text-warning-foreground",
      },
    ],
    tags: ["Enterprise", "Content Scaling", "B2B"],
    featured: true,
  },
];

const successMetrics = [
  {
    icon: TrendingUp,
    value: "340%",
    label: "Average Traffic Increase",
    description: "Across all client implementations",
  },
  {
    icon: Users,
    value: "250+",
    label: "Successful Implementations",
    description: "Businesses transformed with AI",
  },
  {
    icon: Clock,
    value: "3.2x",
    label: "Faster Results",
    description: "Compared to traditional SEO",
  },
  {
    icon: Award,
    value: "98%",
    label: "Client Retention Rate",
    description: "Long-term partnership success",
  },
];

export default function CaseStudiesPage() {
  const fadeIn = useFadeInVariants();
  const viewport = { once: true, amount: 0.2 } as const;
  return (
    <div className="min-h-[100dvh] sm:min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <motion.section
        className="pt-32 pb-16 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={fadeIn}
        custom={0}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Real Results from
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {" "}
              AI-Powered SEO
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Discover how businesses across industries are achieving
            unprecedented growth with RankPilot's NeuroSEO™ Suite. These aren't
            just numbers—they're transformations.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            <Brain className="mr-2 h-5 w-5" />
            Start Your Success Story
          </Button>
        </div>
      </motion.section>

      {/* Success Metrics */}
      <section className="pb-16 px-4" role="region" aria-labelledby="success-metrics-heading">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {successMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeIn}
                custom={index + 1}
              >
                <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    {index === 0 && (
                      <h2 id="success-metrics-heading" className="sr-only">Success Metrics</h2>
                    )}
                    <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <metric.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-2">
                      {metric.value}
                    </div>
                    <div className="font-semibold text-foreground mb-1">
                      {metric.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metric.description}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="pb-16 px-4" role="region" aria-labelledby="success-stories-heading">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeIn}
            custom={5}
            className="text-center mb-12"
          >
            <h2 id="success-stories-heading" className="text-3xl font-bold text-foreground mb-4">
              Success Stories
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how different industries leverage NeuroSEO™ to achieve
              remarkable growth
            </p>
          </motion.div>

          <div className="space-y-8">
            {caseStudies.map((study, index) => (
              <motion.div
                key={study.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeIn}
                custom={index + 6}
              >
                <Card
                  className={`hover:shadow-xl transition-shadow duration-300 ${study.featured ? "ring-2 ring-primary shadow-lg" : ""}`}
                >
                  {study.featured && (
                    <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2">
                      <div className="flex items-center justify-center">
                        <Award className="h-4 w-4 mr-2" />
                        <span className="text-sm font-semibold">
                          Featured Success Story
                        </span>
                      </div>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">
                          {study.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span>
                            <strong>Company:</strong> {study.company}
                          </span>
                          <span>
                            <strong>Industry:</strong> {study.industry}
                          </span>
                          <span>
                            <strong>Duration:</strong> {study.duration}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {study.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="bg-primary/10 text-primary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">
                          Challenge
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {study.challenge}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2">
                          Solution
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {study.solution}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-3">
                          Results
                        </h4>
                        <div className="space-y-2">
                          {study.results.map((result, resultIndex) => (
                            <div
                              key={resultIndex}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="text-muted-foreground">
                                {result.metric}
                              </span>
                              <span className={`font-bold ${result.color}`}>
                                {result.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                      <Button variant="outline" className="w-full group" aria-label={`Read full case study: ${study.title}`}>
                        Read Full Case Study
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={fadeIn}
        custom={10}
      >
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary to-accent text-white" role="region" aria-labelledby="cta-success-heading">
            <CardContent className="p-12 text-center">
              <h2 id="cta-success-heading" className="text-3xl font-bold mb-6">
                Ready to Write Your Success Story?
              </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Join hundreds of businesses already achieving unprecedented
                growth with RankPilot's AI-powered SEO platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg">
                  <Zap className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-transparent bg-white text-primary hover:bg-white/90"
                >
                  Schedule Strategy Call
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
