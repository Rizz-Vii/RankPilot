"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cookie, Shield, Settings, Eye, Users, Clock } from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

const cookieTypes = [
  {
    type: "Essential Cookies",
    icon: Shield,
    description: "Required for basic website functionality and security",
    examples: [
      "Authentication tokens",
      "Session management",
      "Security preferences",
      "CSRF protection",
    ],
    retention: "Session or 30 days",
    canDisable: false,
  },
  {
    type: "Analytics Cookies",
    icon: Eye,
    description: "Help us understand how visitors use our website",
    examples: [
      "Google Analytics",
      "Page view tracking",
      "User journey analysis",
      "Performance monitoring",
    ],
    retention: "24 months",
    canDisable: true,
  },
  {
    type: "Functional Cookies",
    icon: Settings,
    description: "Remember your preferences and settings",
    examples: [
      "Language preferences",
      "Theme settings",
      "Dashboard layout",
      "Notification preferences",
    ],
    retention: "12 months",
    canDisable: true,
  },
  {
    type: "Marketing Cookies",
    icon: Users,
    description: "Used to deliver relevant advertisements",
    examples: [
      "Ad personalization",
      "Campaign tracking",
      "Social media integration",
      "Retargeting pixels",
    ],
    retention: "12 months",
    canDisable: true,
  },
];

const dataProcessing = [
  {
    purpose: "Website Functionality",
    data: "Login status, preferences, session data",
    legalBasis: "Legitimate Interest",
    retention: "Session to 30 days",
  },
  {
    purpose: "Analytics & Performance",
    data: "Page views, click tracking, usage patterns",
    legalBasis: "Consent",
    retention: "24 months",
  },
  {
    purpose: "Marketing & Advertising",
    data: "Ad interactions, campaign attribution",
    legalBasis: "Consent",
    retention: "12 months",
  },
  {
    purpose: "Security & Fraud Prevention",
    data: "IP addresses, device fingerprints",
    legalBasis: "Legitimate Interest",
    retention: "12 months",
  },
];

export default function CookiesPage() {
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
              <Cookie className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Cookie Policy
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            This policy explains how RankPilot uses cookies and similar
            technologies to provide, improve, and protect our services. Your
            privacy and control matter to us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <Settings className="mr-2 h-5 w-5" />
              Manage Cookie Preferences
            </Button>
            <Button variant="outline" size="lg">
              <Shield className="mr-2 h-5 w-5" />
              View Privacy Policy
            </Button>
          </div>
        </div>
      </motion.section>

      {/* What Are Cookies */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={1}
      >
        <div className="max-w-4xl mx-auto">
  <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">What Are Cookies?</h2>
        <p className="text-primary-foreground/80 mb-4">
                Cookies are small text files stored on your device when you
                visit websites. They help websites remember your preferences,
                keep you logged in, and provide personalized experiences.
              </p>
        <p className="text-primary-foreground/80">
                We use cookies responsibly and transparently, giving you control
                over non-essential cookies while ensuring our website functions
                properly for your SEO analysis needs.
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Cookie Types */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={2}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Types of Cookies We Use
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Different cookies serve different purposes. Here's what each type
              does and how you can control them.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {cookieTypes.map((cookie, index) => (
              <motion.div
                key={cookie.type}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 3}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <cookie.icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{cookie.type}</CardTitle>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${cookie.canDisable ? "bg-success/15 text-success-foreground" : "bg-muted text-foreground"}`}
                      >
                        {cookie.canDisable ? "Optional" : "Required"}
                      </div>
                    </div>
                    <p className="text-muted-foreground">{cookie.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">
                          Examples:
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {cookie.examples.map((example, exampleIndex) => (
                            <li
                              key={exampleIndex}
                              className="flex items-center"
                            >
                              <div className="w-1 h-1 bg-muted-foreground/50 rounded-full mr-2"></div>
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        Retention: {cookie.retention}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Processing Table */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={7}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Data Processing Details
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transparency about how we process cookie data and our legal basis
              for each purpose
            </p>
          </motion.div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold">Purpose</th>
                      <th className="text-left p-4 font-semibold">
                        Data Collected
                      </th>
                      <th className="text-left p-4 font-semibold">
                        Legal Basis
                      </th>
                      <th className="text-left p-4 font-semibold">Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataProcessing.map((item, index) => (
                      <motion.tr
                        key={item.purpose}
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        custom={index + 8}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="p-4 font-medium">{item.purpose}</td>
                        <td className="p-4 text-muted-foreground">{item.data}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${item.legalBasis === "Consent" ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning-foreground"}`}
                          >
                            {item.legalBasis}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{item.retention}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Your Rights */}
      <section className="pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={12}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Your Cookie Rights & Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-lg mb-3">Browser Controls</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Block or delete cookies in browser settings</li>
                      <li>• Set preferences for third-party cookies</li>
                      <li>• Use incognito/private browsing mode</li>
                      <li>• Install cookie management extensions</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-3">
                      RankPilot Controls
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Manage preferences in your account settings</li>
                      <li>• Opt out of analytics and marketing cookies</li>
                      <li>• Request deletion of stored data</li>
                      <li>• Contact us for specific privacy requests</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-warning/10 border border-warning/40 rounded-lg p-4">
                  <p className="text-warning-foreground text-sm">
                    <strong>Note:</strong> Disabling essential cookies may
                    affect website functionality, including your ability to log
                    in and use NeuroSEO™ analysis features.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Contact & Updates */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={13}
      >
        <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-6">
                Questions About Cookies?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Our privacy team is here to help with any questions about
                cookies, data processing, or your privacy rights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg">
                  <Settings className="mr-2 h-5 w-5" />
                  Update Cookie Preferences
                </Button>
                <Button variant="outline" size="lg" className="border-transparent bg-white text-primary hover:bg-white/90">
                  Contact Privacy Team
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/30 text-sm text-primary-foreground/80">
                <p>
                  Last updated: July 24, 2025 • We'll notify you of any
                  significant changes to this policy
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
