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
import { Menu, X, User, LogOut, Sun, Moon, Search as SearchIcon } from "lucide-react";
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
import GlobalSearch from "@/components/global-search";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { CommandPaletteButton } from "@/components/command-palette";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/lib/themes/theme-system";
import { useI18n } from "@/lib/i18n/internationalization-system";
import { useToast } from "@/hooks/use-toast";

const navigationItems = [
  { href: "/features", label: "nav.features", external: false },
  { href: "/#pricing", label: "nav.pricing", external: false },
  { href: "/#faq", label: "nav.faq", external: false },
  { href: "/docs", label: "nav.docs", external: false },
];

export default function SiteHeader() {
  const { user } = useAuth();
  const hydrated = useHydration();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme, isDark, isHighContrast } = useTheme() as any; // cast for added method usage
  const { translate } = useI18n();
  const [a11yMessage, setA11yMessage] = useState("");
  const { toast } = useToast();

  const toggleTheme = () => {
    // cycle light -> dark -> high-contrast -> auto -> light
    const order: any[] = ["light", "dark", "high-contrast", "auto"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  const msg = translate('feedback.theme.cycled');
  setA11yMessage(msg);
  toast({ title: msg });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
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

  <TooltipProvider delayDuration={200}>
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
                {translate(item.label)}
              </Link>
            ))}
          </nav>

          {/* Desktop Utility + Auth Cluster */}
          <div className="hidden md:flex items-center space-x-4 flex-nowrap">
            {/* Global Search now only appears at xl+ to guarantee horizontal space */}
            <div className="hidden xl:block flex-1 min-w-[200px] max-w-[420px]">
              <GlobalSearch />
            </div>
            {/* Utility cluster: theme + language (language only from xl to prevent collision) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden lg:flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <EnhancedButton
                      variant="ghost"
                      size="icon"
                      aria-label="Toggle theme"
                      onClick={toggleTheme}
                    >
                      {hydrated ? (
                        theme === 'high-contrast' ? (
                          <span className="relative inline-flex">
                            <Sun className="h-5 w-5" />
                            <span className="absolute -top-1 -right-1 text-[8px] px-1 py-[1px] leading-none rounded bg-warning text-warning-foreground font-bold">HC</span>
                          </span>
                        ) : isDark() ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />
                      ) : (
                        <span className="h-5 w-5" aria-hidden />
                      )}
                    </EnhancedButton>
                  </TooltipTrigger>
                  <TooltipContent>Cycle Theme</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <LanguageSelector variant="compact" showLabel={false} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Language</TooltipContent>
                </Tooltip>
              </div>
              {/* md screens show condensed command palette (still visible when search hidden) */}
              <div className="lg:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <CommandPaletteButton />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Command (Ctrl/Cmd+K)
                  </TooltipContent>
                </Tooltip>
              </div>
              {/* lg-only (>=lg <xl) minimal search/command access */}
              <div className="hidden lg:flex xl:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <CommandPaletteButton />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Search & Commands</TooltipContent>
                </Tooltip>
              </div>
              {/* Provide theme toggle in a compact form for lg-only (between lg and xl) via icon button to avoid overlap */}
              <div className="hidden lg:flex xl:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <EnhancedButton
                      variant="ghost"
                      size="icon"
                      aria-label="Toggle theme"
                      onClick={toggleTheme}
                    >
                      {hydrated ? (
                        theme === 'high-contrast' ? (
                          <span className="relative inline-flex">
                            <Sun className="h-5 w-5" />
                            <span className="absolute -top-1 -right-1 text-[8px] px-1 py-[1px] leading-none rounded bg-warning text-warning-foreground font-bold">HC</span>
                          </span>
                        ) : isDark() ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />
                      ) : (
                        <span className="h-5 w-5" aria-hidden />
                      )}
                    </EnhancedButton>
                  </TooltipTrigger>
                  <TooltipContent>Cycle Theme</TooltipContent>
                </Tooltip>
              </div>
            </div>
            {!hydrated ? (
              // Collapsed: render nothing pre-hydration (no spacer)
              null
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
                      {translate('nav.dashboard')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      {translate('settings.tabs.account')}
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
                  {translate('nav.features')}
                </Link>
                {/* Streamlined CTA: remove muted login button per request; keep single primary trial entry */}
                <EnhancedButton asChild>
                  <Link href="/register">{translate('cta.startFreeTrial')}</Link>
                </EnhancedButton>
              </div>
            )}
          </div>

          {/* Unified Mobile Sidebar */}
          <PublicMobileSidebar className="md:hidden" />
  </div>
  {/* aria-live region for feedback */}
  <div aria-live="polite" className="sr-only" role="status">{a11yMessage}</div>
  </motion.header>
  </TooltipProvider>
    </>
  );
}
