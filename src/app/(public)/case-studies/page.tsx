"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  Clock,
  Award,
  ArrowRight,
  Brain,
  Zap,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

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
      { metric: "Organic Traffic", _value: "+340%", color: "text-green-600" },
      {
        metric: "Revenue from Organic",
        _value: "+280%",
        color: "text-blue-600",
      },
      {
        metric: "Keyword Rankings (Top 3)",
        _value: "+150%",
        color: "text-purple-600",
      },
      { metric: "Conversion Rate", _value: "+45%", color: "text-orange-600" },
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
      { metric: "Brand Visibility", _value: "+450%", color: "text-green-600" },
      { metric: "Lead Generation", _value: "+220%", color: "text-blue-600" },
      { metric: "Featured Snippets", _value: "+180%", color: "text-purple-600" },
      {
        metric: "Domain Authority",
        _value: "+35 points",
        color: "text-orange-600",
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
        _value: "+520%",
        color: "text-green-600",
      },
      { metric: "Patient Inquiries", _value: "+180%", color: "text-blue-600" },
      {
        metric: "Google My Business Views",
        _value: "+300%",
        color: "text-purple-600",
      },
      {
        metric: "Appointment Bookings",
        _value: "+150%",
        color: "text-orange-600",
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
      { metric: "Organic Sessions", _value: "+290%", color: "text-green-600" },
      { metric: "Content Performance", _value: "+400%", color: "text-blue-600" },
      {
        metric: "Sales Qualified Leads",
        _value: "+160%",
        color: "text-purple-600",
      },
      {
        metric: "Content Production Speed",
        _value: "+600%",
        color: "text-orange-600",
      },
    ],
    tags: ["Enterprise", "Content Scaling", "B2B"],
    featured: true,
  },
];

const successMetrics = [
  {
    icon: TrendingUp,
    _value: "340%",
    label: "Average Traffic Increase",
    description: "Across all client implementations",
  },
  {
    icon: Users,
    _value: "250+",
    label: "Successful Implementations",
    description: "Businesses transformed with AI",
  },
  {
    icon: Clock,
    _value: "3.2x",
    label: "Faster Results",
    description: "Compared to traditional SEO",
  },
  {
    icon: Award,
    _value: "98%",
    label: "Client Retention Rate",
    description: "Long-term partnership success",
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <motion.section
        className="pt-32 pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={0}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Real Results from
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              AI-Powered SEO
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover how businesses across industries are achieving
            unprecedented growth with RankPilot's NeuroSEO™ Suite. These aren't
            just numbers—they're transformations.
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Brain className="mr-2 h-5 w-5" />
            Start Your Success Story
          </Button>
        </div>
      </motion.section>

      {/* Success Metrics */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {successMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 1}
              >
                <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <metric.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {metric._value}
                    </div>
                    <div className="font-semibold text-gray-700 mb-1">
                      {metric.label}
                    </div>
                    <div className="text-sm text-gray-500">
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
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={5}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Success Stories
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See how different industries leverage NeuroSEO™ to achieve
              remarkable growth
            </p>
          </motion.div>

          <div className="space-y-8">
            {caseStudies.map((study, index) => (
              <motion.div
                key={study.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 6}
              >
                <Card
                  className={`hover:shadow-xl transition-shadow duration-300 ${study.featured ? "ring-2 ring-blue-500 shadow-lg" : ""}`}
                >
                  {study.featured && (
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2">
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
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
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
                            <Badge
                              key={tagIndex}
                              variant="secondary"
                              className="bg-blue-100 text-blue-800"
                            >
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
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Challenge
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {study.challenge}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Solution
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {study.solution}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Results
                        </h4>
                        <div className="space-y-2">
                          {study.results.map((result, resultIndex) => (
                            <div
                              key={resultIndex}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="text-gray-600">
                                {result.metric}
                              </span>
                              <span className={`font-bold ${result.color}`}>
                                {result._value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <Button variant="outline" className="w-full group">
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
        animate="visible"
        variants={fadeIn}
        custom={10}
      >
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-6">
                Ready to Write Your Success Story?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
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
                  className="border-white text-white hover:bg-white hover:text-blue-600"
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
