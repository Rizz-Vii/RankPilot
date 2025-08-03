"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  FileText,
  Shield,
  Mail,
  Users,
  Zap,
  Target,
  TrendingUp,
  BookOpen,
  Phone,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const sitemapSections = [
  {
    title: "Main Navigation",
    icon: <Home className="h-5 w-5" />,
    links: [
      { name: "Home", href: "/", description: "Welcome to RankPilot" },
      {
        name: "Dashboard",
        href: "/dashboard",
        description: "Your SEO command center",
      },
      { name: "Pricing", href: "/pricing", description: "Choose your plan" },
      {
        name: "Features",
        href: "/features",
        description: "Explore our capabilities",
      },
      { name: "About", href: "/about", description: "Learn about our mission" },
      {
        name: "Contact",
        href: "/contact",
        description: "Get in touch with us",
      },
    ],
  },
  {
    title: "SEO Tools",
    icon: <BarChart3 className="h-5 w-5" />,
    links: [
      {
        name: "Link Analysis",
        href: "/tools/link-analysis",
        description: "Analyze backlink quality and opportunities",
      },
      {
        name: "SERP Analysis",
        href: "/tools/serp-analysis",
        description: "Understand search engine results",
      },
      {
        name: "Keyword Research",
        href: "/tools/keyword-research",
        description: "Discover valuable keywords",
      },
      {
        name: "Site Audit",
        href: "/tools/site-audit",
        description: "Comprehensive website analysis",
      },
      {
        name: "Competitor Analysis",
        href: "/tools/competitor-analysis",
        description: "Spy on your competition",
      },
      {
        name: "Rank Tracking",
        href: "/tools/rank-tracking",
        description: "Monitor your search rankings",
      },
    ],
  },
  {
    title: "Account & Billing",
    icon: <CreditCard className="h-5 w-5" />,
    links: [
      {
        name: "Profile Settings",
        href: "/profile",
        description: "Manage your account information",
      },
      {
        name: "Billing Settings",
        href: "/profile?tab=billing",
        description: "Manage subscription and payments",
      },
      {
        name: "Team Management",
        href: "/profile?tab=team",
        description: "Invite and manage team members",
      },
      {
        name: "API Keys",
        href: "/profile?tab=api",
        description: "Generate and manage API access",
      },
      {
        name: "Notifications",
        href: "/profile?tab=notifications",
        description: "Control email and app notifications",
      },
      {
        name: "Security",
        href: "/profile?tab=security",
        description: "Two-factor auth and login settings",
      },
    ],
  },
  {
    title: "Support & Help",
    icon: <HelpCircle className="h-5 w-5" />,
    links: [
      {
        name: "Help Center",
        href: "/help",
        description: "Find answers to common questions",
      },
      {
        name: "Documentation",
        href: "/docs",
        description: "API docs and integration guides",
      },
      {
        name: "Video Tutorials",
        href: "/tutorials",
        description: "Step-by-step video guides",
      },
      {
        name: "Community Forum",
        href: "/community",
        description: "Connect with other users",
      },
      {
        name: "Feature Requests",
        href: "/feedback",
        description: "Suggest new features",
      },
      {
        name: "Bug Reports",
        href: "/bugs",
        description: "Report issues and bugs",
      },
    ],
  },
  {
    title: "Legal & Compliance",
    icon: <Shield className="h-5 w-5" />,
    links: [
      {
        name: "Terms of Service",
        href: "/terms",
        description: "Our terms and conditions",
      },
      {
        name: "Privacy Policy",
        href: "/privacy",
        description: "How we protect your data",
      },
      {
        name: "Cookie Policy",
        href: "/cookies",
        description: "Our use of cookies",
      },
      {
        name: "GDPR Compliance",
        href: "/gdpr",
        description: "Data protection information",
      },
      {
        name: "Security Policy",
        href: "/security",
        description: "Our security practices",
      },
      {
        name: "Acceptable Use",
        href: "/acceptable-use",
        description: "Platform usage guidelines",
      },
    ],
  },
  {
    title: "Resources",
    icon: <BookOpen className="h-5 w-5" />,
    links: [
      {
        name: "Blog",
        href: "/blog",
        description: "SEO tips, tricks, and industry news",
      },
      {
        name: "Case Studies",
        href: "/case-studies",
        description: "Success stories from our users",
      },
      {
        name: "SEO Guide",
        href: "/guide/seo",
        description: "Complete guide to SEO",
      },
      {
        name: "Link Building Guide",
        href: "/guide/link-building",
        description: "Master the art of link building",
      },
      {
        name: "Technical SEO",
        href: "/guide/technical-seo",
        description: "Advanced technical optimization",
      },
      {
        name: "Local SEO",
        href: "/guide/local-seo",
        description: "Dominate local search results",
      },
    ],
  },
  {
    title: "Company",
    icon: <Users className="h-5 w-5" />,
    links: [
      {
        name: "About Us",
        href: "/about",
        description: "Our story and mission",
      },
      {
        name: "Team",
        href: "/team",
        description: "Meet the people behind RankPilot",
      },
      {
        name: "Careers",
        href: "/careers",
        description: "Join our growing team",
      },
      {
        name: "Press Kit",
        href: "/press",
        description: "Media resources and brand assets",
      },
      {
        name: "Partner Program",
        href: "/partners",
        description: "Become a RankPilot partner",
      },
      {
        name: "Affiliate Program",
        href: "/affiliates",
        description: "Earn by referring customers",
      },
    ],
  },
  {
    title: "Integrations",
    icon: <Zap className="h-5 w-5" />,
    links: [
      {
        name: "Google Analytics",
        href: "/integrations/google-analytics",
        description: "Connect your GA account",
      },
      {
        name: "Search Console",
        href: "/integrations/search-console",
        description: "Import GSC data",
      },
      {
        name: "Google Ads",
        href: "/integrations/google-ads",
        description: "Sync advertising data",
      },
      {
        name: "Shopify",
        href: "/integrations/shopify",
        description: "E-commerce SEO integration",
      },
      {
        name: "WordPress",
        href: "/integrations/wordpress",
        description: "WordPress plugin",
      },
      {
        name: "Zapier",
        href: "/integrations/zapier",
        description: "Automate your workflow",
      },
    ],
  },
];

const quickActions = [
  {
    name: "Start Free Trial",
    href: "/signup",
    icon: <Target className="h-4 w-4" />,
    variant: "default" as const,
  },
  {
    name: "View Pricing",
    href: "/pricing",
    icon: <TrendingUp className="h-4 w-4" />,
    variant: "outline" as const,
  },
  {
    name: "Contact Sales",
    href: "/contact?type=sales",
    icon: <Phone className="h-4 w-4" />,
    variant: "outline" as const,
  },
  {
    name: "Get Support",
    href: "/support",
    icon: <Mail className="h-4 w-4" />,
    variant: "outline" as const,
  },
];

const popularPages = [
  { name: "Link Analysis Tool", href: "/tools/link-analysis", visits: "12.3k" },
  { name: "SERP Checker", href: "/tools/serp-analysis", visits: "8.7k" },
  { name: "Pricing Plans", href: "/pricing", visits: "15.2k" },
  { name: "API Documentation", href: "/docs/api", visits: "5.4k" },
  { name: "SEO Blog", href: "/blog", visits: "9.8k" },
  { name: "Help Center", href: "/help", visits: "7.1k" },
];

export default function Sitemap() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold font-headline mb-4">Site Map</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore all pages and features available on RankPilot. Find exactly
            what you're looking for.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <Button
                      variant={action.variant}
                      className="w-full h-auto p-4 flex flex-col gap-2"
                    >
                      {action.icon}
                      <span className="text-sm">{action.name}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Popular Pages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Popular Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularPages.map((page, index) => (
                  <Link key={index} href={page.href}>
                    <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center justify-between">
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {page.name}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{page.visits} visits</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Sitemap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {sitemapSections.map((section, sectionIndex) => (
            <motion.div
              key={sectionIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + sectionIndex * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {section.links.map((link, linkIndex) => (
                      <div key={linkIndex}>
                        <Link href={link.href}>
                          <div className="group p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium group-hover:text-primary transition-colors">
                                  {link.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {link.description}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        </Link>
                        {linkIndex < section.links.length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">
                Can't Find What You're Looking For?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Our support team is here to help you navigate RankPilot and find
                exactly what you need.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/search">
                  <Button size="lg">
                    <FileText className="h-4 w-4 mr-2" />
                    Search Site
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Last Updated */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            Found a broken link?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Let us know
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
