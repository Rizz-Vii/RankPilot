"use client";

import { ChatBot } from "@/components/chat";
import { DevHydrationSanitizer } from "@/components/dev/DevHydrationSanitizer";
import {
  PerformanceIndicator,
  WebVitalsMonitor,
} from "@/components/performance/web-vitals-monitor";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import SiteFooter from "@/components/site-footer";
import EnhancedErrorBoundary from "@/components/ui/enhanced-error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { UIProvider } from "@/context/UIContext";
import { initializeGlobalErrorHandler } from "@/lib/global-error-handler";
import { useEffect } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeGlobalErrorHandler();
  }, []);
  return (
    <UIProvider>
      <DevHydrationSanitizer />
      <EnhancedErrorBoundary showDetails>{children}</EnhancedErrorBoundary>
      <Toaster />
      <SonnerToaster position="top-right" richColors />
      <SiteFooter />
      <WebVitalsMonitor />
      <PerformanceIndicator />
      <PWAInstallPrompt />

      {/* AI Chatbot System - Global availability for all authenticated users */}
      <ChatBot />
    </UIProvider>
  );
}
