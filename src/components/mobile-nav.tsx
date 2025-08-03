"use client";

import { useState, useEffect } from "react";
import { Menu, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EnhancedMobileNav } from "@/components/enhanced-app-nav";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";
import type { NavItem } from "@/constants/enhanced-nav";

const overlayVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
};

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, role } = useAuth();
  const { subscription } = useSubscription();

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll when mobile nav is open and handle accessibility
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Add ARIA attributes for accessibility
      document.documentElement.setAttribute("data-mobile-nav-open", "true");
      // Add escape key listener for accessibility
      const handleEscKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeMenu();
      };
      document.addEventListener("keydown", handleEscKey);
      return () => {
        document.removeEventListener("keydown", handleEscKey);
        document.body.style.overflow = "unset";
        document.documentElement.removeAttribute("data-mobile-nav-open");
      };
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.removeAttribute("data-mobile-nav-open");
    }
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleNavItemClick = (item: NavItem) => {
    console.log("Mobile navigation clicked:", item.title);
    closeMenu();
  };

  // Don't render until mounted to avoid hydration issues
  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-12 w-12 min-h-[48px] min-w-[48px] opacity-0 mobile-button"
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
        className="md:hidden h-12 w-12 min-h-[48px] min-w-[48px] mobile-button"
        aria-label="Toggle mobile menu"
        aria-expanded={isOpen}
        data-testid="mobile-menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Enhanced Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={overlayVariants}
              className="fixed inset-0 h-screen w-screen bg-black/90 backdrop-blur-md z-[55] md:hidden"
              style={{ height: "100dvh" }}
              onClick={closeMenu}
            />

            {/* Enhanced Mobile Navigation Component */}
            <EnhancedMobileNav
              userTier={subscription?.tier}
              isAdmin={role === "admin"}
              onCloseAction={closeMenu}
              onItemClickAction={handleNavItemClick}
            />

            {/* User Info Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 left-4 right-4 z-[80] md:hidden"
            >
              <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-medium text-xs">
                      {user?.email?.[0].toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subscription?.tier || "Free"} •{" "}
                      {role === "admin" ? "Admin" : "User"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      onClick={closeMenu}
                    >
                      <Link href="/settings">
                        <User className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      onClick={closeMenu}
                    >
                      <Link href="/logout">
                        <LogOut className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
