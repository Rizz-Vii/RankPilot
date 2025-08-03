"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AppLogo, AppName } from "@/constants/nav";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const drawerVariants = {
  closed: { x: "-100%" },
  open: { x: "0%" },
};

const overlayVariants = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

export default function AuthMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navigationItems = [
    { title: "Home", href: "/" },
    { title: "Features", href: "/#features" },
    { title: "Pricing", href: "/#pricing" },
    { title: "FAQ", href: "/#faq" },
  ];

  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-12 w-12 min-h-[48px] min-w-[48px] opacity-0"
        aria-label="Loading menu"
        disabled
      >
        <Menu className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <>
      {/* Hamburger Button - Only show on mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        className="md:hidden h-12 w-12 min-h-[48px] min-w-[48px]"
        aria-label="Toggle mobile menu"
        aria-expanded={isOpen}
        data-testid="auth-mobile-menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

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
              data-testid="auth-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={closeMenu}
                  >
                    <AppLogo className="h-8 w-8 text-primary" />
                    <span className="text-xl font-headline font-bold text-primary">
                      {AppName}
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeMenu}
                    className="h-12 w-12 min-h-[48px] min-w-[48px]"
                    aria-label="Close mobile menu"
                    data-testid="auth-close"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-6 py-4">
                  <div className="space-y-2">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors min-h-[48px]"
                        data-testid={`auth-nav-${item.title.toLowerCase()}`}
                      >
                        <span className="font-medium text-gray-700">
                          {item.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </nav>

                {/* Auth Actions */}
                <div className="px-6 py-4 border-t space-y-2">
                  {user ? (
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className="flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium min-h-[48px]"
                    >
                      Go to Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={closeMenu}
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg font-medium min-h-[48px] hover:bg-gray-50 transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={closeMenu}
                        className="flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium min-h-[48px]"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
