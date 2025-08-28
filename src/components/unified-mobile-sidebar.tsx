"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppLogo, AppName } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscription } from "@/hooks/useSubscription";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { Crown, LogOut, Menu, User, Zap } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

// Unified navigation items for all layouts
const publicNavigationItems = [
  { title: "Home", href: "/" },
  { title: "Features", href: "/#features" },
  { title: "Pricing", href: "/#pricing" },
  { title: "FAQ", href: "/#faq" },
  { title: "Documentation", href: "/docs" },
];

interface UnifiedMobileSidebarProps {
  mode: "public" | "auth" | "app";
  children?: React.ReactNode;
  className?: string;
}

export default function UnifiedMobileSidebar({
  mode,
  children,
  className,
}: UnifiedMobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, role } = useAuth();
  const { subscription } = useSubscription();
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
      document.documentElement.setAttribute("data-mobile-sidebar-open", "true");

      const handleEscKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false);
      };
      document.addEventListener("keydown", handleEscKey);

      return () => {
        document.body.style.overflow = "";
        document.documentElement.removeAttribute("data-mobile-sidebar-open");
        document.removeEventListener("keydown", handleEscKey);
      };
    }
  }, [isOpen, isMobile]);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const closeMenu = () => setIsOpen(false);

  if (!isMounted || !isMobile) {
    // Pre-hydration: avoid layout shift and disabled/opacity artifacts
    return <span className="md:hidden inline-block h-12 w-12 min-h-[48px] min-w-[48px]" aria-hidden />;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "md:hidden h-12 w-12 min-h-[48px] min-w-[48px]",
            className
          )}
          aria-label="Toggle mobile menu"
          aria-expanded={isOpen}
          data-testid={`${mode}-mobile-menu`}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-80 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
        data-testid={`${mode}-sidebar`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-sidebar-border bg-sidebar shrink-0">
            <Link
              href={mode === "app" ? "/dashboard" : "/"}
              className="flex items-center gap-2"
              onClick={closeMenu}
            >
              <AppLogo className="h-8 w-8 text-primary" />
              <span className="text-xl font-headline font-bold text-primary">
                {AppName}
              </span>
            </Link>
          </div>

          {/* Navigation Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {mode === "app" && children ? (
                // App mode: Show full navigation
                <div className="space-y-1">{children}</div>
              ) : (
                // Public/Auth mode: Show public navigation
                <nav className="space-y-2">
                  {publicNavigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="flex items-center px-4 py-3 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors min-h-[48px]"
                      data-testid={`${mode}-nav-${item.title.toLowerCase()}`}
                    >
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-6 border-t border-sidebar-border bg-sidebar shrink-0">
            {user ? (
              <div className="space-y-3">
                {/* User Info */}
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors min-h-[48px]"
                >
                  <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-medium text-sm">
                      {user?.email?.[0].toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-sidebar-foreground/70">
                        {role === "admin" ? "Administrator" : "User"}
                      </p>
                      <div className="flex items-center gap-1">
                        {(subscription?.tier === "agency" || subscription?.tier === "enterprise") && (
                          <Crown className="h-3 w-3 text-purple-500" />
                        )}
                        {subscription?.tier === "starter" && (
                          <Zap className="h-3 w-3 text-primary" />
                        )}
                        <span className="text-xs font-medium capitalize">
                          {subscription?.planName || "Free"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {mode === "app" && (
                    <Link
                      href="/settings"
                      onClick={closeMenu}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors min-h-[48px] w-full text-left"
                    >
                      <User className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => { void handleLogout(); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors min-h-[48px] w-full justify-start"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            ) : (
              // Not logged in: Show auth actions
              <div className="space-y-2">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center justify-center px-4 py-3 border border-sidebar-border rounded-lg font-medium min-h-[48px] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium min-h-[48px] hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Export convenience components for different modes
export const PublicMobileSidebar = (
  props: Omit<UnifiedMobileSidebarProps, "mode">
) => <UnifiedMobileSidebar {...props} mode="public" />;

export const AuthMobileSidebar = (
  props: Omit<UnifiedMobileSidebarProps, "mode">
) => <UnifiedMobileSidebar {...props} mode="auth" />;

export const AppMobileSidebar = (
  props: Omit<UnifiedMobileSidebarProps, "mode">
) => <UnifiedMobileSidebar {...props} mode="app" />;
