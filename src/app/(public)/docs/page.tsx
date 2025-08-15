"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, ExternalLink, Search, Code2, Zap, Brain } from "lucide-react";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

const documentationSections = [
  {
    title: "Getting Started",
    icon: Zap,
    description: "Quick setup guide to get RankPilot running in minutes",
    items: [
      { title: "Installation & Setup", href: "#installation" },
      { title: "First Analysis", href: "#first-analysis" },
      { title: "Dashboard Overview", href: "#dashboard" },
      { title: "API Keys Configuration", href: "#api-keys" },
    ],
  },
  {
    title: "NeuroSEO™ Suite",
    icon: Brain,
    description: "Complete guide to our 6 AI-powered SEO engines",
    items: [
      { title: "NeuralCrawler™ Documentation", href: "#neural-crawler" },
      { title: "SemanticMap™ Analysis", href: "#semantic-map" },
      { title: "AI Visibility Engine", href: "#ai-visibility" },
      { title: "TrustBlock™ Features", href: "#trust-block" },
      { title: "RewriteGen™ Usage", href: "#rewrite-gen" },
      { title: "Orchestrator API", href: "#orchestrator" },
    ],
  },
  {
    title: "API Reference",
    icon: Code2,
    description: "Complete API documentation for developers",
    items: [
      { title: "Authentication", href: "#auth" },
      { title: "Endpoints Overview", href: "#endpoints" },
      { title: "Rate Limits", href: "#rate-limits" },
      { title: "Error Handling", href: "#errors" },
      { title: "Webhooks", href: "#webhooks" },
      { title: "SDKs & Libraries", href: "#sdks" },
    ],
  },
  {
    title: "Best Practices",
    icon: Search,
    description: "Expert tips for maximizing your SEO results",
    items: [
      { title: "Content Optimization", href: "#content-optimization" },
      { title: "Technical SEO", href: "#technical-seo" },
      { title: "Keyword Strategy", href: "#keyword-strategy" },
      { title: "Performance Monitoring", href: "#performance" },
    ],
  },
];

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <motion.section
        className="pt-32 pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={0}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Book className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            RankPilot Documentation
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete guides, API references, and best practices for mastering
            AI-first SEO with RankPilot's NeuroSEO™ Suite.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <Zap className="mr-2 h-5 w-5" />
              Quick Start Guide
            </Button>
            <Button variant="outline" size="lg">
              <Code2 className="mr-2 h-5 w-5" />
              API Reference
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Documentation Sections */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {documentationSections.map((section, index) => (
              <motion.div
                key={section.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 1}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <section.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                    </div>
                    <p className="text-muted-foreground">{section.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          <Link
                            href={item.href}
                            className="flex items-center justify-between group text-foreground hover:text-primary transition-colors"
                          >
                            <span>{item.title}</span>
                            <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
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

      {/* Quick Access Section */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={5}
      >
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">
                  Need Help Getting Started?
                </h2>
                <p className="text-primary/25 mb-6 max-w-2xl mx-auto">
                  Our AI-powered support system can help you find exactly what
                  you need in seconds.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="secondary" size="lg">
                    <Search className="mr-2 h-5 w-5" />
                    Search Documentation
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-transparent bg-white text-primary hover:bg-white/90"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
