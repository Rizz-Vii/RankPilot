// Test page for mobile navigation development
"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const mockNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: "📊" },
  { title: "Keyword Tool", href: "/keyword-tool", icon: "🔑" },
  { title: "SEO Audit", href: "/seo-audit", icon: "🔍" },
  { title: "Content Analyzer", href: "/content-analyzer", icon: "📝" },
  { title: "Competitors", href: "/competitors", icon: "👥" },
  { title: "Link Analysis", href: "/link-view", icon: "🔗" },
  { title: "SERP View", href: "/serp-view", icon: "📈" },
];

const drawerVariants = {
  closed: {
    x: "-100%",
    transition: { type: "spring" as const, stiffness: 400, damping: 40 },
  },
  open: {
    x: "0%",
    transition: { type: "spring" as const, stiffness: 400, damping: 40 },
  },
};

const overlayVariants = {
  closed: { opacity: 0, transition: { duration: 0.2 } },
  open: { opacity: 1, transition: { duration: 0.2 } },
};

export default function MobileNavTestPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  if (!isMounted) {
    return (
      <div className="p-4">
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h1 className="text-2xl font-bold mb-2">
            Mobile Navigation Test Page
          </h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Info Header */}
      <div className="p-4 bg-blue-50 border-b">
        <h1 className="text-2xl font-bold mb-2">Mobile Navigation Test Page</h1>
        <p className="text-sm text-gray-600">
          This page tests mobile navigation without authentication requirements.
          Resize to mobile viewport to see hamburger menu.
        </p>
      </div>

      {/* Mobile Navigation */}
      <div className="fixed top-20 left-4 z-50 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMenu}
          className="h-12 w-12 min-h-[48px] min-w-[48px] bg-white shadow-md"
          aria-label="Toggle mobile menu"
          aria-expanded={isOpen}
          data-testid="mobile-menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={overlayVariants}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMenu}
            />

            {/* Drawer */}
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={drawerVariants}
              className="fixed left-0 top-0 h-full w-80 bg-white z-50 md:hidden shadow-2xl"
              data-testid="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">R</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      RankPilot
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeMenu}
                    className="h-12 w-12 min-h-[48px] min-w-[48px]"
                    aria-label="Close mobile menu"
                    data-testid="mobile-close"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-6 py-4">
                  <div className="space-y-2">
                    {mockNavItems.map((item, _index) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
                        data-testid={`nav-item-${item.title.toLowerCase().replace(" ", "-")}`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium text-gray-700">
                          {item.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="p-4 pt-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-medium mb-2">Desktop View (≥768px)</h3>
              <p className="text-sm text-gray-600">
                Hamburger menu should be hidden. Use browser dev tools to test.
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-medium mb-2">Mobile View (&lt;768px)</h3>
              <p className="text-sm text-gray-600">
                Hamburger menu should appear at top-left. Click to open drawer.
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-medium mb-2">Test Elements</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <code>data-testid="mobile-menu"</code> - Hamburger button
                </li>
                <li>
                  • <code>data-testid="mobile-drawer"</code> - Navigation drawer
                </li>
                <li>
                  • <code>data-testid="mobile-close"</code> - Close button
                </li>
                <li>• Touch targets: All buttons 44px minimum</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
