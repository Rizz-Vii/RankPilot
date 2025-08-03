// src/components/site-header.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AppLogo, AppName } from "@/constants/nav";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useAuth } from "@/context/AuthContext";
import { useHydration } from "@/components/HydrationContext";
import { useIsMobile } from "@/lib/mobile-responsive-utils";
import { Menu, X, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ContextAwareLogo } from "@/components/context-aware-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PublicMobileSidebar } from "@/components/unified-mobile-sidebar";

const navigationItems = [
  { href: "/features", label: "Features", external: false },
  { href: "/#pricing", label: "Pricing", external: false },
  { href: "/#faq", label: "FAQ", external: false },
  { href: "/docs", label: "Documentation", external: false },
];

export default function SiteHeader() {
  const { user } = useAuth();
  const hydrated = useHydration();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (_error) {
      console.error("Logout _error:", _error);
    }
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Skip to main content for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-[100] bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
      >
        Skip to main content
      </a>

      <motion.header
        className={cn(
          "sticky top-0 w-full z-50 transition-all duration-300",
          scrolled
            ? "bg-background/95 backdrop-blur-md shadow-lg border-b border-border/50"
            : "bg-background/90 backdrop-blur-sm border-b border-border/20"
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="container flex h-16 max-w-7xl items-center justify-between px-4 mx-auto">
          {/* Logo */}
          <ContextAwareLogo />

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-6"
            role="navigation"
            aria-label="Main navigation"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!hydrated ? (
              // Loading skeleton
              <div className="flex items-center space-x-2">
                <div className="h-9 w-16 bg-muted animate-pulse rounded-md" />
                <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <EnhancedButton
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="User menu"
                  >
                    <User className="h-5 w-5" />
                  </EnhancedButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/demo"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Live Demo
                </Link>
                <div className="flex items-center gap-2">
                  <EnhancedButton variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                  </EnhancedButton>
                  <EnhancedButton asChild>
                    <Link href="/register">Start Free Trial</Link>
                  </EnhancedButton>
                </div>
              </div>
            )}
          </div>

          {/* Unified Mobile Sidebar */}
          <PublicMobileSidebar className="md:hidden" />
        </div>
      </motion.header>
    </>
  );
}
