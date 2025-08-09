// src/app/(app)/layout.tsx
"use client";

import {
  FeedbackToast,
  GlobalLoadingIndicator,
  ScrollArea,
  MainPanel,
  TopLoader,
} from "@/components/ui";
import { HydrationProvider } from "@/components/HydrationContext";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppLogo, AppName } from "@/constants/nav";
import Link from "next/link";
import LoadingScreen from "@/components/ui/loading-screen";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import AppNav from "@/components/app-nav";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { LogOut, User, Crown, Zap, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { DevUserSwitcher } from "@/components/dev/DevUserSwitcher";
import { AppMobileSidebar } from "@/components/unified-mobile-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user: authUser, loading: authLoading } = useProtectedRoute();
  const { user, role } = useAuth();
  const { subscription } = useSubscription();

  if (authLoading || !authUser) {
    return <LoadingScreen fullScreen />;
  }

  return (
    <HydrationProvider>
      <SidebarProvider defaultOpen={true}>
        {/* Mobile Navigation Header */}
        <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <AppLogo className="h-8 w-8 text-primary shrink-0" />
              <span className="text-xl font-headline font-bold text-primary">
                {AppName}
              </span>
            </Link>
            <AppMobileSidebar>
              <AppNav />
            </AppMobileSidebar>
          </div>
        </div>

        <div className="flex h-screen w-screen bg-background pt-16 md:pt-0">
          <Sidebar className="flex flex-col">
            <SidebarHeader className="p-4 flex items-center justify-between shrink-0 gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 group-data-[state=collapsed]:justify-center"
              >
                <AppLogo className="h-8 w-8 text-primary shrink-0" />
                <span className="text-2xl font-headline font-bold text-primary group-data-[state=collapsed]:hidden">
                  {AppName}
                </span>
              </Link>
              {/* Desktop collapse/expand button */}
              <div className="hidden md:flex">
                <SidebarTrigger className="h-9 w-9 rounded-md hover:bg-sidebar-accent" />
              </div>
            </SidebarHeader>
            <SidebarContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <AppNav />
              </ScrollArea>
            </SidebarContent>

            {/* Desktop User Menu Footer */}
            <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar shrink-0">
              <div className="space-y-3">
                {/* User Info - Clickable Profile Button */}
                <Button
                  asChild
                  variant="ghost"
                  className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/50 h-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start"
                >
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 w-full"
                  >
                    <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                      <span className="text-primary-foreground font-medium text-sm">
                        {user?.email?.[0].toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">
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
                          <span className="text-xs font-medium capitalize text-sidebar-foreground/90">
                            {subscription?.planName || "Free"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Button>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Settings button removed - now handled as standalone item */}

                  {subscription?.tier === "free" && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
                    >
                      <Link
                        href="/settings/billing"
                        className="flex items-center gap-3"
                      >
                        <Zap className="h-4 w-4 shrink-0" />
                        <span className="group-data-[state=collapsed]:hidden">
                          Upgrade Plan
                        </span>
                      </Link>
                    </Button>
                  )}

                  {/* Standalone Settings Button */}
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-10 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
                  >
                    <Link href="/settings" className="flex items-center gap-3">
                      <Settings className="h-4 w-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">
                        Settings
                      </span>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
                  >
                    <Link href="/logout" className="flex items-center gap-3">
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">
                        Sign Out
                      </span>
                    </Link>
                  </Button>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>
          <MainPanel>{children}</MainPanel>
        </div>
        <FeedbackToast />
        <GlobalLoadingIndicator />
        <TopLoader />
        <DevUserSwitcher />
      </SidebarProvider>
    </HydrationProvider>
  );
}
