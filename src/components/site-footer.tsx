"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppLogo, AppName } from "@/constants/nav";
import {
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaGithub,
} from "react-icons/fa";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronUp } from "lucide-react";

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
  { href: "https://twitter.com/rankpilot", icon: FaTwitter, label: "Twitter" },
  {
    href: "https://linkedin.com/company/rankpilot",
    icon: FaLinkedin,
    label: "LinkedIn",
  },
  { href: "https://youtube.com/@rankpilot", icon: FaYoutube, label: "YouTube" },
  { href: "https://github.com/rankpilot", icon: FaGithub, label: "GitHub" },
];

export default function SiteFooter() {
  const [emailSubscription, setEmailSubscription] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setEmailSubscription("");
    setIsSubscribing(false);
    // You could show a success toast here
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
    >
      {/* Scroll to top button */}
      <Button
        onClick={scrollToTop}
        size="icon"
        className="absolute -top-6 right-6 rounded-full shadow-lg"
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Newsletter Section */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Stay Updated with RankPilot
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Get the latest SEO insights, feature updates, and industry trends
              delivered to your inbox.
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder="Enter your email"
                value={emailSubscription}
                onChange={(e) => setEmailSubscription(e.target.value)}
                required
                className="flex-1"
                disabled={isSubscribing}
              />
              <Button
                type="submit"
                disabled={isSubscribing || !emailSubscription}
                className="sm:w-auto"
              >
                {isSubscribing ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </motion.div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-sm">
          {/* Company Info */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <AppLogo className="h-8 w-8 text-primary transition-transform group-hover:scale-105" />
              <span className="text-xl font-bold text-foreground">
                {AppName}
              </span>
            </Link>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              AI-First SEO Platform helping businesses achieve maximum
              visibility in the age of intelligent search.
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={social.label}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Footer Sections */}
          {Object.entries(footerSections).map(
            ([key, section], sectionIndex) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + sectionIndex * 0.1 }}
                viewport={{ once: true }}
              >
                <h4 className="font-semibold mb-4 text-foreground tracking-tight">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.3 + sectionIndex * 0.1 + linkIndex * 0.05,
                      }}
                      viewport={{ once: true }}
                    >
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        {link.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )
          )}
        </div>

        {/* Bottom Section */}
        <motion.div
          className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="text-muted-foreground text-sm">
            © 2025 {AppName}. All rights reserved.
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Cookies
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
