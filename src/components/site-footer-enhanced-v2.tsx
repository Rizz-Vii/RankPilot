"use client";

import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { AppLogo, AppName } from "@/constants/nav";
import { useIsMobile } from "@/lib/mobile-responsive-utils";
import { motion } from "framer-motion";
import { ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  FaEnvelope,
  FaGithub,
  FaLinkedin,
  FaMapMarkerAlt,
  FaPhone,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";

const footerSections = {
  services: {
    title: "Services",
    links: [
      { href: "/seo-audit", label: "SEO Audit" },
      { href: "/keyword-tool", label: "Keyword Intelligence" },
      { href: "/content-analyzer", label: "Content Analyzer" },
      { href: "/competitors", label: "Competitor Tracking" },
      { href: "/link-view", label: "Link Analysis" },
      { href: "/serp-view", label: "SERP View" },
      { href: "/content-brief", label: "Content Brief" },
    ],
  },
  neuroseo: {
    title: "NeuroSEO™ Suite",
    links: [
      { href: "/neuroseo", label: "NeuroSEO™ Dashboard" },
      { href: "/neuroseo/neural-crawler", label: "NeuralCrawler™" },
      { href: "/neuroseo/semantic-map", label: "SemanticMap™" },
      { href: "/neuroseo/ai-visibility", label: "AI Visibility Engine" },
      { href: "/neuroseo/trust-block", label: "TrustBlock™" },
      { href: "/neuroseo/rewrite-gen", label: "RewriteGen™" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/docs", label: "Documentation" },
      { href: "/tutorials", label: "Tutorials" },
      { href: "/case-studies", label: "Case Studies" },
      { href: "/api-docs", label: "API Documentation" },
      { href: "/help", label: "Help Center" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/security", label: "Security" },
    ],
  },
};

const socialLinks = [
  {
    href: "https://twitter.com/rankpilot",
    icon: FaTwitter,
    label: "Follow us on Twitter",
    external: true,
  },
  {
    href: "https://linkedin.com/company/rankpilot",
    icon: FaLinkedin,
    label: "Connect on LinkedIn",
    external: true,
  },
  {
    href: "https://youtube.com/@rankpilot",
    icon: FaYoutube,
    label: "Subscribe to our YouTube channel",
    external: true,
  },
  {
    href: "https://github.com/rankpilot",
    icon: FaGithub,
    label: "View our GitHub projects",
    external: true,
  },
];

const contactInfo = {
  email: "support@rankpilot.com",
  phone: "+1 (555) 123-4567",
  address: "123 SEO Street, Digital City, DC 12345",
};

export default function SiteFooter() {
  const [emailSubscription, setEmailSubscription] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const isMobile = useIsMobile();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubscription.trim()) return;

    setIsSubscribing(true);

    try {
      // Simulate API call - replace with actual newsletter subscription
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setEmailSubscription("");
      // You could show a success toast here
    } catch (error) {
      console.error("Newsletter subscription failed:", error);
      // You could show an error toast here
    } finally {
      setIsSubscribing(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer
      className="w-full bg-background/95 backdrop-blur-sm border-t border-border/50 relative"
      style={{
        boxShadow: "0 -8px 32px -8px rgba(0,0,0,0.10)",
        zIndex: 10,
      }}
      role="contentinfo"
      aria-label="Site footer"
    >
      {/* Scroll to top button */}
      <EnhancedButton
        onClick={scrollToTop}
        size="icon"
        className="absolute -top-6 right-6 rounded-full shadow-lg"
        aria-label="Scroll to top of page"
        variant="secondary"
      >
        <ChevronUp className="h-4 w-4" />
      </EnhancedButton>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Newsletter Section */}
        <motion.section
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          aria-labelledby="newsletter-heading"
        >
          <h3
            id="newsletter-heading"
            className="text-xl sm:text-2xl font-bold text-foreground mb-4"
          >
            Stay Updated with RankPilot
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-sm sm:text-base">
            Get the latest SEO insights, feature updates, and industry trends
            delivered to your inbox.
          </p>
          <form
            onSubmit={(e) => { void handleNewsletterSubmit(e); }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            aria-label="Newsletter subscription"
          >
            <Input
              type="email"
              placeholder="Enter your email address"
              value={emailSubscription}
              onChange={(e) => setEmailSubscription(e.target.value)}
              required
              className="flex-1"
              disabled={isSubscribing}
              aria-label="Email address for newsletter"
              autoComplete="email"
            />
            <EnhancedButton
              type="submit"
              disabled={isSubscribing || !emailSubscription.trim()}
              className="sm:w-auto"
              loading={isSubscribing}
              loadingText="Subscribing..."
              size={isMobile ? "mobile" : "default"}
            >
              {isSubscribing ? "Subscribing..." : "Subscribe"}
            </EnhancedButton>
          </form>
        </motion.section>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/"
              className="flex items-center space-x-2 mb-4 group"
              aria-label="RankPilot homepage"
            >
              <div className="relative w-8 h-8">
                <AppLogo className="w-full h-full" />
              </div>
              <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {AppName}
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs">
              The AI-powered SEO platform that transforms your digital presence
              with NeuroSEO™ technology.
            </p>

            {/* Contact Information */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <FaEnvelope className="h-3 w-3" aria-hidden="true" />
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="hover:text-primary transition-colors focus:outline-none focus:text-primary"
                  aria-label={`Email us at ${contactInfo.email}`}
                >
                  {contactInfo.email}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <FaPhone className="h-3 w-3" aria-hidden="true" />
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="hover:text-primary transition-colors focus:outline-none focus:text-primary"
                  aria-label={`Call us at ${contactInfo.phone}`}
                >
                  {contactInfo.phone}
                </a>
              </div>
              <div className="flex items-start space-x-2">
                <FaMapMarkerAlt className="h-3 w-3 mt-0.5" aria-hidden="true" />
                <address className="not-italic">{contactInfo.address}</address>
              </div>
            </div>
          </motion.div>

          {/* Footer Sections */}
          {Object.entries(footerSections).map(([key, section], index) => (
            <motion.nav
              key={key}
              className="lg:col-span-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * (index + 2) }}
              viewport={{ once: true }}
              aria-labelledby={`${key}-heading`}
            >
              <h4
                id={`${key}-heading`}
                className="text-sm font-semibold text-foreground mb-4"
              >
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:text-primary"
                      aria-label={`${link.label} page`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>
          ))}
        </div>

        {/* Bottom Section */}
        <motion.div
          className="border-t border-border/50 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          {/* Social Links */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Follow us:
            </span>
            <nav aria-label="Social media links" className="flex space-x-3">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target={social.external ? "_blank" : undefined}
                    rel={social.external ? "noopener noreferrer" : undefined}
                    className="text-muted-foreground hover:text-primary transition-colors p-2 -m-2 focus:outline-none focus:text-primary"
                    aria-label={social.label}
                  >
                    <IconComponent className="h-5 w-5" aria-hidden="true" />
                    {social.external && (
                      <ExternalLink
                        className="h-3 w-3 ml-1 inline"
                        aria-hidden="true"
                      />
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground text-center sm:text-right">
            <p>
              © {new Date().getFullYear()} {AppName}. All rights reserved.
            </p>
            <p className="mt-1">
              Powered by{" "}
              <span className="text-primary font-medium">NeuroSEO™</span>{" "}
              technology
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
