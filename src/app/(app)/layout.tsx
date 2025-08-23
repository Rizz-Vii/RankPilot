// src/app/(app)/layout.tsx
"use client";

import AppNav from "@/components/app-nav";
import { DevUserSwitcher } from "@/components/dev/DevUserSwitcher";
import { HydrationProvider } from "@/components/HydrationContext";
import {
  FeedbackToast,
  GlobalLoadingIndicator,
  MainPanel,
  ScrollArea,
  TopLoader,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/ui/loading-screen";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuLink,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppMobileSidebar } from "@/components/unified-mobile-sidebar";
import { AppLogo, AppName } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, LogOut, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user: authUser, loading: authLoading } = useProtectedRoute();
  const { user, role } = useAuth();
  const { subscription } = useSubscription();

  const pathname = usePathname();

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
                {/* User Info - Unified Sidebar Styling */}
                <SidebarMenu asChild>
                  <ul>
                    <SidebarMenuItem>
                      <SidebarMenuLink
                        href="/profile"
                        isActive={pathname === "/profile" || pathname?.startsWith("/profile/")}
                        className="w-full"
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
                                <Crown className="h-3 w-3 text-accent" />
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
                      </SidebarMenuLink>
                    </SidebarMenuItem>
                  </ul>
                </SidebarMenu>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Settings button removed - now handled as standalone item */}

                  {subscription?.tier === "free" && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-10 text-primary hover:text-primary/80 hover:bg-primary/10 dark:hover:bg-primary/20 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
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

                  {/* Settings Link (unified sidebar styling) */}
                  <SidebarMenu asChild>
                    <ul>
                      <SidebarMenuItem>
                        <SidebarMenuLink
                          href="/settings"
                          isActive={pathname === "/settings" || pathname?.startsWith("/settings/")}
                          className="w-full"
                        >
                          <Settings className="h-4 w-4 shrink-0" />
                          <span className="group-data-[state=collapsed]:hidden">Settings</span>
                        </SidebarMenuLink>
                      </SidebarMenuItem>
                    </ul>
                  </SidebarMenu>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-10 text-destructive-foreground hover:text-destructive-foreground/80 hover:bg-destructive/10 dark:hover:bg-destructive/20 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
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
