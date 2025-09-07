"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  FileCheck,
  Lock,
  Server,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Motion helpers with reduced-motion + mobile-aware tuning
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
    // If user prefers reduced motion, keep subtle, fast fades without movement
    if (reduceMotion) {
      return {
        hidden: { opacity: 0 },
        visible: (i: number) => ({
          opacity: 1,
          transition: { delay: Math.min(i * 0.05, 0.3), duration: 0.25 },
        }),
      } as const;
    }
    // On mobile, shorten duration and spacing to avoid jank; still animate
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

const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption",
  },
  {
    icon: Shield,
    title: "SOC 2 Type II Compliance",
    description:
      "Independently audited security controls meeting enterprise security standards",
  },
  {
    icon: Eye,
    title: "Zero-Knowledge Architecture",
    description:
      "We can't access your website data - everything is encrypted with your unique keys",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description:
      "Hosted on enterprise-grade Firebase with 99.9% uptime SLA and DDoS protection",
  },
  {
    icon: FileCheck,
    title: "Regular Security Audits",
    description:
      "Quarterly penetration testing and continuous vulnerability monitoring",
  },
  {
    icon: Users,
    title: "Access Controls",
    description:
      "Role-based permissions, 2FA, and single sign-on (SSO) for enterprise accounts",
  },
];

const complianceItems = [
  {
    title: "GDPR Compliant",
    description: "Full compliance with European data protection regulations",
    status: "active",
  },
  {
    title: "CCPA Compliant",
    description: "California Consumer Privacy Act compliance for US users",
    status: "active",
  },
  {
    title: "SOC 2 Type II",
    description:
      "Annual audits ensuring security, availability, and confidentiality",
    status: "active",
  },
  {
    title: "ISO 27001",
    description: "Information security management system certification",
    status: "in-progress",
  },
];

const dataHandling = [
  {
    category: "Website Analysis Data",
    retention: "90 days",
    encryption: "AES-256",
    access: "Encrypted, customer-controlled",
  },
  {
    category: "User Account Information",
    retention: "Account lifetime + 30 days",
    encryption: "AES-256 + Hashing",
    access: "Encrypted, minimal access",
  },
  {
    category: "API Usage Logs",
    retention: "12 months",
    encryption: "AES-256",
    access: "Aggregated, anonymized",
  },
  {
    category: "Support Communications",
    retention: "2 years",
    encryption: "TLS 1.3",
    access: "Support team only",
  },
];

export default function SecurityPage() {
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
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Enterprise-Grade Security
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Your data security is our top priority. RankPilot implements
            military-grade encryption, zero-knowledge architecture, and
            industry-leading compliance standards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90"
              aria-label="View third-party security report"
            >
              <FileCheck className="mr-2 h-5 w-5" />
              View Security Report
            </Button>
            <Button variant="outline" size="lg" aria-label="Report a security vulnerability">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Report Vulnerability
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Security Features */}
      <section className="pb-16 px-4" role="region" aria-labelledby="security-features-heading">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeIn}
            custom={1}
            className="text-center mb-12"
          >
            <h2 id="security-features-heading" className="text-3xl font-bold text-foreground mb-4">
              Security Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive security measures protecting your data at every
              level
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeIn}
                custom={index + 2}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="pb-16 px-4" role="region" aria-labelledby="compliance-heading">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeIn}
            custom={8}
            className="text-center mb-12"
          >
            <h2 id="compliance-heading" className="text-3xl font-bold text-foreground mb-4">
              Compliance & Certifications
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Meeting global regulatory requirements and industry standards
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {complianceItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeIn}
                custom={index + 9}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${item.status === "active" ? "bg-success/15" : "bg-warning/15"}`}
                      >
                        {item.status === "active" ? (
                          <CheckCircle className="h-5 w-5 text-success-foreground" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-warning-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                        {item.status === "in-progress" && (
                          <p className="text-warning-foreground text-sm mt-2 font-medium">
                            Certification in progress - Expected Q2 2025
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Handling */}
      <section className="pb-16 px-4" role="region" aria-labelledby="data-handling-heading">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeIn}
            custom={13}
            className="text-center mb-12"
          >
            <h2 id="data-handling-heading" className="text-3xl font-bold text-foreground mb-4">
              Data Handling & Retention
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transparent data practices with minimal retention and maximum
              security
            </p>
          </motion.div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <caption className="sr-only">Data handling categories, retention, encryption, and access controls</caption>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th scope="col" className="text-left p-4 font-semibold">
                        Data Category
                      </th>
                      <th scope="col" className="text-left p-4 font-semibold">
                        Retention Period
                      </th>
                      <th scope="col" className="text-left p-4 font-semibold">
                        Encryption
                      </th>
                      <th scope="col" className="text-left p-4 font-semibold">
                        Access Control
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataHandling.map((item, index) => (
                      <motion.tr
                        key={item.category}
                        initial="hidden"
                        whileInView="visible"
                        viewport={viewport}
                        variants={fadeIn}
                        custom={index + 14}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="p-4 font-medium">{item.category}</td>
                        <td className="p-4 text-muted-foreground">{item.retention}</td>
                        <td className="p-4 text-muted-foreground">{item.encryption}</td>
                        <td className="p-4 text-muted-foreground">{item.access}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Security Contact */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={fadeIn}
        custom={18}
      >
        <div className="max-w-4xl mx-auto">
  <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-6">Security Questions?</h2>
        <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Our security team is available to answer questions about our
                practices, compliance status, or to discuss enterprise security
                requirements.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg" aria-label="Contact the security team">
                  <Shield className="mr-2 h-5 w-5" />
                  Contact Security Team
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-transparent bg-white text-primary hover:bg-white/90"
                  aria-label="Download the security datasheet"
                >
                  <FileCheck className="mr-2 h-5 w-5" />
                  Download Security Datasheet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
